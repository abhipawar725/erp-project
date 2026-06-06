import { Router, Request, Response, NextFunction } from 'express';
import { body, param }       from 'express-validator';
import { Op }                from 'sequelize';
import { sequelize }         from '../../config/database';
import { Company }           from '../../database/models/Company';
import { Employee }          from '../../database/models/Employee';
import { Role, RoleModulePermission } from '../../database/models/RoleModels';
import { EmployeeRole }      from '../../database/models/AuthModels';
import { Department }        from '../../database/models/Department';
import { Designation }       from '../../database/models/Designation';
import { CompanyManager }    from '../../database/models/CompanyManager';
import { AppError }          from '../../middleware/errorHandler.middleware';
import { authenticate, authorize, requireSuperAdmin } from '../auth/auth.middleware';
import { validate }          from '../../middleware/validate.middleware';
import { logActivity }       from '../../utils/activityLogger';
import {
  sendResponse, sendError, sendPaginated,
  parsePaginationParams, buildPaginationMeta,
} from '../../utils/response';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Generate employee code for a company
async function nextEmpCode(companyId: number, slug: string): Promise<string> {
  const count  = await Employee.count({ where: { company_id: companyId } });
  const prefix = slug.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'E');
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

// Check if the requesting employee manages a specific company
async function isCompanyManager(employeeId: number, companyId: number): Promise<boolean> {
  const row = await CompanyManager.findOne({ where: { employee_id: employeeId, company_id: companyId } });
  return !!row;
}

// Guard: super admin OR assigned manager of this specific company
async function requireCompanyAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  if (req.user.isSuperAdmin) { next(); return; }
  const companyId = +req.params.id;
  const ok = await isCompanyManager(req.user.employeeId, companyId);
  if (!ok) { sendError(res, 'Forbidden: You are not assigned to manage this company', 403); return; }
  next();
}

// ─── Platform stats ───────────────────────────────────────────────────────────

async function getPlatformStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [total, active, totalEmployees] = await Promise.all([
      Company.count({ paranoid: false }),
      Company.count({ where: { is_active: true } }),
      Employee.count(),
    ]);
    const planRows = await Company.findAll({
      attributes: ['subscription_plan', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { is_active: true }, group: ['subscription_plan'], raw: true,
    }) as any[];
    const plans: Record<string, number> = {};
    for (const r of planRows) plans[r.subscription_plan] = Number(r.count);
    sendResponse(res, { data: { totalCompanies: total, activeCompanies: active, suspendedCompanies: total - active, totalEmployees, plans } });
  } catch(e){ next(e); }
}

// ─── List companies ───────────────────────────────────────────────────────────
// Super admin: sees all companies
// Other employees: sees only companies they manage

async function listCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query as any);
    const where: any = {};

    if (!req.user!.isSuperAdmin) {
      // Scope to only companies this employee manages
      const managed = await CompanyManager.findAll({
        where: { employee_id: req.user!.employeeId },
        attributes: ['company_id'],
      });
      const managedIds = managed.map(m => m.company_id);
      if (!managedIds.length) { sendPaginated(res, [], buildPaginationMeta(page, limit, 0)); return; }
      where.id = managedIds;
    }

    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    if (req.query.plan) where.subscription_plan = req.query.plan;
    if (req.query.search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${req.query.search}%` } },
        { slug:  { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows } = await Company.findAndCountAll({
      where, limit, offset, order: [['created_at', 'DESC']], paranoid: false,
    });

    // Attach live counts + primary manager
    const ids = rows.map(c => c.id);
    const [empCounts, managers] = await Promise.all([
      Employee.findAll({ where: { company_id: ids }, attributes: ['company_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['company_id'], raw: true }),
      CompanyManager.findAll({
        where: { company_id: ids, is_primary: true },
        include: [{ model: Employee, as: 'employee', attributes: ['id','first_name','last_name','avatar_url'] }],
      }),
    ]);

    const eMap: Record<number, number> = {};
    for (const r of empCounts as any[]) eMap[r.company_id] = Number(r.cnt);
    const mMap: Record<number, any> = {};
    for (const m of managers) mMap[m.company_id] = (m as any).employee;

    sendPaginated(res, rows.map(c => ({
      ...c.toJSON(),
      employee_count:   eMap[c.id] || 0,
      primary_manager:  mMap[c.id] || null,
    })), buildPaginationMeta(page, limit, count));
  } catch(e){ next(e); }
}

// ─── My companies ─────────────────────────────────────────────────────────────

async function getMyCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const assignments = await CompanyManager.findAll({
      where:   { employee_id: req.user!.employeeId },
      include: [{ model: Company, as: 'company' }],
      order:   [['assigned_at', 'DESC']],
    });
    sendResponse(res, { data: assignments.map(a => ({ ...(a as any).company?.toJSON(), manager_role: a.role, is_primary: a.is_primary })) });
  } catch(e){ next(e); }
}

// ─── Get single company ───────────────────────────────────────────────────────

async function getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await Company.findByPk(+req.params.id, { paranoid: false });
    if (!company) { sendError(res, 'Company not found', 404); return; }

    const [empCount, managers, roles] = await Promise.all([
      Employee.count({ where: { company_id: company.id } }),
      CompanyManager.findAll({
        where:   { company_id: company.id },
        include: [{ model: Employee, as: 'employee', attributes: ['id','first_name','last_name','email','avatar_url','employee_code'] }],
        order:   [['is_primary','DESC'],['assigned_at','ASC']],
      }),
      Role.findAll({ where: { company_id: company.id }, attributes: ['id','name','slug','is_system'] }),
    ]);

    sendResponse(res, {
      data: {
        ...company.toJSON(),
        employee_count: empCount,
        managers: managers.map(m => ({
          employee: (m as any).employee,
          role:        m.role,
          is_primary:  m.is_primary,
          assigned_at: m.assigned_at,
        })),
        roles,
      },
    });
  } catch(e){ next(e); }
}

// ─── Create company ───────────────────────────────────────────────────────────
// Creates: company → system roles → departments → first employee admin → assigns creator as owner

async function createCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      name, city, state, country, industry, email, phone,
      subscription_plan, max_employees, timezone, currency,
      // First admin employee details
      admin_first_name, admin_last_name, admin_email, admin_phone,
      // Managers to assign (array of employee_ids from other companies)
      manager_employee_ids = [],
    } = req.body;

    const slug = (req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).slice(0, 100);

    const exists = await Company.findOne({ where: { slug }, paranoid: false });
    if (exists) { sendError(res, 'A company with this slug already exists', 409); return; }

    // Validate admin email unique
    if (admin_email) {
      const emailTaken = await Employee.findOne({ where: { email: admin_email.toLowerCase() } });
      if (emailTaken) { sendError(res, `Email ${admin_email} is already registered`, 409); return; }
    }

    const t = await sequelize.transaction();
    try {
      // 1. Create company
      const company = await Company.create({
        name, slug,
        city: city || null, state: state || null, country: country || 'India',
        industry: industry || null, email: email || null, phone: phone || null,
        max_employees:     Number(max_employees) || 100,
        timezone:          timezone || 'Asia/Kolkata',
        currency:          currency || 'INR',
        is_active:         true,
        onboarding_step:   0,
        created_by: req.user!.employeeId,
      }, { transaction: t });

      // 2. Seed system roles from templates
      const templates = await (await import('../../database/models/AuthModels')).RoleTemplate.findAll();
      const roles: any[] = [];
      for (const tmpl of templates) {
        const [role] = await Role.findOrCreate({
          where:    { company_id: company.id, slug: tmpl.slug },
          defaults: { company_id: company.id, name: tmpl.name, slug: tmpl.slug, is_system: true, template_id: tmpl.id },
          transaction: t,
        } as any);
        roles.push(role);
      }

      // Copy permissions from templates into role_module_permissions
      const { RoleTemplatePermission } = await import('../../database/models/AuthModels');
      for (const role of roles) {
        if (!(role as any).template_id) continue;
        const tPerms = await RoleTemplatePermission.findAll({ where: { template_id: (role as any).template_id } });
        for (const tp of tPerms) {
          await RoleModulePermission.findOrCreate({
            where: { role_id: role.id, module: tp.module },
            defaults: { role_id: role.id, module: tp.module, can_view: tp.can_view, can_edit: tp.can_edit, can_delete: tp.can_delete, can_download: tp.can_download, },
            transaction: t,
          } as any);
        }
      }

      // 3. Seed default departments
      const depts = await Department.bulkCreate([
        { company_id: company.id, name: 'Human Resources', code: 'HR'  },
        { company_id: company.id, name: 'Engineering',     code: 'ENG' },
        { company_id: company.id, name: 'Finance',         code: 'FIN' },
        { company_id: company.id, name: 'Operations',      code: 'OPS' },
      ], { transaction: t, ignoreDuplicates: true });

      // 4. Create first admin EMPLOYEE (employee-as-identity)
      let firstEmployee: Employee | null = null;
      if (admin_email) {
        const adminRole = roles.find(r => r.slug === 'admin') || roles[0];
        const hrDept    = depts[0];
        const empCode   = await nextEmpCode(company.id, slug);

        firstEmployee = await Employee.create({
          company_id:      company.id,
          employee_code:   empCode,
          first_name:      admin_first_name || 'Admin',
          last_name:       admin_last_name  || 'User',
          email:           admin_email.toLowerCase(),
          phone:           admin_phone || null,
          department_id:   hrDept?.id || null,
          date_of_joining: new Date(),
          employment_type: 'Full-time',
          work_location:   'Office',
          status:          'Active',
          portal_access:   true,
          is_super_admin:  false,
          must_change_password: true,
        }, { transaction: t });

        // Assign admin role to first employee
        await EmployeeRole.create({
          employee_id: firstEmployee.id,
          role_id:     adminRole.id,
          company_id:  company.id,
          assigned_by: req.user!.employeeId,
        }, { transaction: t });
      }

      // 5. Assign the CREATOR as owner of this company
      await CompanyManager.create({
        company_id:  company.id,
        employee_id: req.user!.employeeId,
        role:        'owner',
        is_primary:  true,
        assigned_by: req.user!.employeeId,
      }, { transaction: t });

      // 6. Assign additional managers (if provided)
      if (manager_employee_ids.length > 0) {
        const validManagers = await Employee.findAll({
          where: { id: manager_employee_ids, status: 'Active' },
          attributes: ['id'],
        });
        for (const emp of validManagers) {
          if (emp.id === req.user!.employeeId) continue; // already assigned as owner
          await CompanyManager.findOrCreate({
            where:    { company_id: company.id, employee_id: emp.id },
            defaults: {
              company_id:  company.id,
              employee_id: emp.id,
              role:        'admin',
              is_primary:  false,
              assigned_by: req.user!.employeeId,
            },
            transaction: t,
          } as any);
        }
      }

      await company.update({ onboarding_step: 5, setup_completed_at: new Date() }, { transaction: t });
      await t.commit();

      await logActivity({
        companyId:  req.user!.companyId,
        employeeId: req.user!.employeeId,
        action:     'COMPANY_CREATED',
        module:     'companies',
        entityId:   company.id,
        newValues:  { name, slug, admin_email, managers_assigned: manager_employee_ids.length + 1 },
      });

      sendResponse(res, {
        statusCode: 201,
        message: `${name} created successfully`,
        data: {
          id:             company.id,
          name:           company.name,
          slug:           company.slug,
          first_employee: firstEmployee ? {
            id:            firstEmployee.id,
            employee_code: firstEmployee.employee_code,
            email:         firstEmployee.email,
          } : null,
          note: firstEmployee
            ? `First admin employee (${firstEmployee.employee_code}) created. They can log in via OTP.`
            : 'Company created. Add employees via the Employees module.',
        },
      });
    } catch(e2){ await t.rollback(); throw e2; }
  } catch(e){ next(e); }
}

// ─── Update company ───────────────────────────────────────────────────────────

async function updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await Company.findByPk(+req.params.id);
    if (!company) { sendError(res, 'Company not found', 404); return; }

    const allowed = ['name','city','state','country','industry','email','phone','website',
                     'logo_url','gstin','pan','subscription_plan','max_employees',
                     'timezone','currency','date_format','notes'];
    const updates: any = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }

    await company.update(updates);
    await logActivity({ companyId: req.user!.companyId, employeeId: req.user!.employeeId, action: 'COMPANY_UPDATED', module: 'companies', entityId: company.id });
    sendResponse(res, { data: company, message: 'Company updated' });
  } catch(e){ next(e); }
}

// ─── Suspend / Activate ───────────────────────────────────────────────────────

async function suspendCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await Company.findByPk(+req.params.id);
    if (!company) { sendError(res, 'Company not found', 404); return; }
    // Cannot suspend a company you don't manage (non-super-admins)
    if (!req.user!.isSuperAdmin) {
      const ok = await isCompanyManager(req.user!.employeeId, company.id);
      if (!ok) { sendError(res, 'Forbidden', 403); return; }
    }
    await company.update({ is_active: false });
    await logActivity({ companyId: req.user!.companyId, employeeId: req.user!.employeeId, action: 'COMPANY_SUSPENDED', module: 'companies', entityId: company.id });
    sendResponse(res, { data: { suspended: true } });
  } catch(e){ next(e); }
}

async function activateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await Company.findByPk(+req.params.id, { paranoid: false });
    if (!company) { sendError(res, 'Company not found', 404); return; }
    await company.update({ is_active: true, deleted_at: null });
    await logActivity({ companyId: req.user!.companyId, employeeId: req.user!.employeeId, action: 'COMPANY_ACTIVATED', module: 'companies', entityId: company.id });
    sendResponse(res, { data: { activated: true } });
  } catch(e){ next(e); }
}

// ─── Manager assignment ───────────────────────────────────────────────────────

async function listManagers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const managers = await CompanyManager.findAll({
      where:   { company_id: +req.params.id },
      include: [{
        model: Employee, as: 'employee',
        attributes: ['id','first_name','last_name','email','avatar_url','employee_code','is_super_admin'],
      }],
      order: [['is_primary','DESC'],['assigned_at','ASC']],
    });
    sendResponse(res, { data: managers });
  } catch(e){ next(e); }
}

async function assignManager(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId  = +req.params.id;
    const { employee_id, role = 'manager', is_primary = false, notes } = req.body;

    const company  = await Company.findByPk(companyId);
    if (!company) { sendError(res, 'Company not found', 404); return; }

    const employee = await Employee.findOne({ where: { id: employee_id, state: 'Active' } });
    if (!employee) { sendError(res, 'Employee not found or inactive', 404); return; }

    // If setting as primary, unset existing primary
    if (is_primary) {
      await CompanyManager.update({ is_primary: false }, { where: { company_id: companyId, is_primary: true } });
    }

    const [manager, created] = await CompanyManager.findOrCreate({
      where:    { company_id: companyId, employee_id },
      defaults: { company_id: companyId, employee_id, role, is_primary, assigned_by: req.user!.employeeId, notes: notes || null },
    });

    if (!created) {
      await manager.update({ role, is_primary, notes: notes || null });
    }

    await logActivity({
      companyId:  req.user!.companyId,
      employeeId: req.user!.employeeId,
      action:     created ? 'COMPANY_MANAGER_ASSIGNED' : 'COMPANY_MANAGER_UPDATED',
      module:     'companies',
      entityId:   companyId,
      newValues:  { employee_id, role, is_primary },
    });

    sendResponse(res, {
      statusCode: created ? 201 : 200,
      data:    manager,
      message: created
        ? `${employee.first_name} ${employee.last_name} assigned as ${role}`
        : `Manager role updated to ${role}`,
    });
  } catch(e){ next(e); }
}

async function removeManager(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId  = +req.params.id;
    const employeeId = +req.params.employeeId;

    // Cannot remove yourself if you're the only manager
    const totalManagers = await CompanyManager.count({ where: { company_id: companyId } });
    if (totalManagers <= 1) {
      sendError(res, 'Cannot remove the last manager from a company', 400); return;
    }

    const deleted = await CompanyManager.destroy({ where: { company_id: companyId, employee_id: employeeId } });
    if (!deleted) { sendError(res, 'Manager assignment not found', 404); return; }

    sendResponse(res, { data: { removed: true } });
  } catch(e){ next(e); }
}

async function getGlobalEligibleManagers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const eligible = await Employee.findAll({
      where: {
        state:     'Active',
        portal_access: true,
        [Op.or]: [
          { is_super_admin: true },
          sequelize.literal(`id IN (
            SELECT er.employee_id FROM employee_roles er
            JOIN role_module_permissions rmp ON rmp.role_id = er.role_id
            WHERE rmp.module = 'companies' AND rmp.can_edit = 1
          )`),
        ],
      },
      attributes: ['id', 'first_name', 'last_name', 'email', 'employee_code', 'is_super_admin'],
      order:      [['first_name', 'ASC']],
      limit:      200,
    });

    sendResponse(res, {
      data: eligible.map(e => ({
        id:            e.id,
        full_name:     `${e.first_name} ${e.last_name}`,
        email:         e.email,
        employee_code: e.employee_code,
        is_super_admin: e.is_super_admin,
      })),
    });
  } catch(e){ next(e); }
}

// ─── Eligible managers (employees who can be assigned) ───────────────────────
// Returns employees who have companies:manage permission in ANY company

async function getEligibleManagers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = +req.params.id;

    // Already assigned
    const existing = await CompanyManager.findAll({
      where: { company_id: companyId },
      attributes: ['employee_id'],
    });
    const existingIds = existing.map(e => e.employee_id);

    // Find employees with companies:manage OR companies:view permission
    // OR is_super_admin = true
    const eligible = await Employee.findAll({
      where: {
        state:     'Active',
        portal_access: true,
        ...(existingIds.length ? { id: { [Op.notIn]: existingIds } } : {}),
        [Op.or]: [
          { is_super_admin: true },
          // Sub-query: has a role with companies:manage permission
          sequelize.literal(`id IN (
            SELECT er.employee_id FROM employee_roles er
            JOIN role_module_permissions rmp ON rmp.role_id = er.role_id
            WHERE rmp.module = 'companies' AND rmp.can_edit = 1
          )`),
        ],
      },
      attributes: ['id','first_name','last_name','email','employee_code','is_super_admin'],
      order:      [['first_name','ASC']],
      limit:      100,
    });

    sendResponse(res, {
      data: eligible.map(e => ({
        id:            e.id,
        full_name:     `${e.first_name} ${e.last_name}`,
        email:         e.email,
        employee_code: e.employee_code,
        is_super_admin: e.is_super_admin,
      })),
    });
  } catch(e){ next(e); }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const companyRouter = Router();
companyRouter.use(authenticate);

// Platform stats — super admin only
companyRouter.get('/platform-stats', requireSuperAdmin, getPlatformStats);

// List + mine
companyRouter.get('/',     authorize('companies:view'),   listCompanies);
companyRouter.get('/mine', authorize('companies:view'),   getMyCompanies);

// CRUD
companyRouter.get   ('/:id',          authorize('companies:view'),   [param('id').isInt()], validate, getCompany);
companyRouter.post  ('/',             authorize('companies:create'),
  [
    body('name').trim().notEmpty().withMessage('Company name required'),
    body('admin_email').optional().isEmail(),
  ],
  validate,
  createCompany,
);
companyRouter.put   ('/:id',          [param('id').isInt()], validate, requireCompanyAccess, authorize('companies:edit'),   updateCompany);
companyRouter.post  ('/:id/suspend',  [param('id').isInt()], validate, authorize('companies:edit'),   suspendCompany);
companyRouter.post  ('/:id/activate', [param('id').isInt()], validate, authorize('companies:edit'),   activateCompany);

// Manager assignment
companyRouter.get   ('/:id/managers',              [param('id').isInt()], validate, requireCompanyAccess, listManagers);
companyRouter.get   ('/:id/eligible-managers',     [param('id').isInt()], validate, requireCompanyAccess, getEligibleManagers);
companyRouter.post  ('/:id/managers',
  [param('id').isInt(), body('employee_id').isInt().withMessage('employee_id required')],
  validate,
  requireCompanyAccess,
  assignManager,
);
companyRouter.put   ('/:id/managers/:employeeId',  [param('id').isInt(), param('employeeId').isInt()], validate, requireCompanyAccess, assignManager);
companyRouter.delete('/:id/managers/:employeeId',  [param('id').isInt(), param('employeeId').isInt()], validate, requireCompanyAccess, removeManager);
