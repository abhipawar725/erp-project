import { Router, Request, Response, NextFunction } from 'express';
import { body, param }  from 'express-validator';
import { Op }           from 'sequelize';
import { sequelize }    from '../../config/database';
import { Company }      from '../../database/models/Company';
import { User }         from '../../database/models/User';
import { Role }         from '../../database/models/RoleModels';
import { Employee }     from '../../database/models/Employee';
import { Department }   from '../../database/models/Department';
import { AppError }     from '../../middleware/errorHandler.middleware';
import { authenticate, authorize, requireSuperAdmin } from '../../modules/auth/auth.middleware';
import { validate }     from '../../middleware/validate.middleware';
import { hashPassword } from '../../utils/hash';
import { logActivity }  from '../../utils/activityLogger';
import { sendResponse, sendError, sendPaginated, parsePaginationParams, buildPaginationMeta } from '../../utils/response';

// ─── Platform stats ───────────────────────────────────────────────────────────

async function getPlatformStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [total, active, totalUsers, totalEmployees] = await Promise.all([
      Company.count({ paranoid: false }),
      Company.count({ where: { is_active: true } }),
      User.count({ where: { is_super_admin: false } }),
      Employee.count(),
    ]);

    sendResponse(res, { data: { totalCompanies: total, activeCompanies: active, suspendedCompanies: total - active, totalUsers, totalEmployees } });
  } catch(e){ next(e); }
}

// ─── Company CRUD ─────────────────────────────────────────────────────────────

async function listCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query as any);
    const where: any = {};
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    if (req.query.search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${req.query.search}%` } },
        { slug:  { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows } = await Company.findAndCountAll({ where, limit, offset, order: [['created_at','DESC']], paranoid: false });
    const ids = rows.map(c => c.id);
    const [uCounts, eCounts] = await Promise.all([
      User.findAll({ where: { company_id: ids, is_super_admin: false }, attributes: ['company_id',[sequelize.fn('COUNT',sequelize.col('id')),'cnt']], group:['company_id'], raw:true }),
      Employee.findAll({ where: { company_id: ids }, attributes: ['company_id',[sequelize.fn('COUNT',sequelize.col('id')),'cnt']], group:['company_id'], raw:true }),
    ]);
    const uMap: Record<number,number> = {};
    const eMap: Record<number,number> = {};
    for (const r of uCounts as any[]) uMap[r.company_id] = Number(r.cnt);
    for (const r of eCounts as any[]) eMap[r.company_id] = Number(r.cnt);

    sendPaginated(res, rows.map(c => ({ ...c.toJSON(), live_user_count: uMap[c.id]||0, live_employee_count: eMap[c.id]||0 })), buildPaginationMeta(page, limit, count));
  } catch(e){ next(e); }
}

async function getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await Company.findByPk(+req.params.id, { paranoid: false });
    if (!company) { sendError(res, 'Company not found', 404); return; }
    const [uCount, eCount, roles] = await Promise.all([
      User.count({ where: { company_id: company.id, is_super_admin: false } }),
      Employee.count({ where: { company_id: company.id } }),
      Role.findAll({ where: { company_id: company.id }, attributes: ['id','name','slug','is_system'], order:[['is_system','DESC']] }),
    ]);
    sendResponse(res, { data: { ...company.toJSON(), live_user_count: uCount, live_employee_count: eCount, roles } });
  } catch(e){ next(e); }
}

async function createCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, admin_email, admin_password, city, state, country, industry, email, phone, max_employees, timezone, currency } = req.body;
    const slug = (req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g,'-')).slice(0,100);

    const exists = await Company.findOne({ where: { slug }, paranoid: false });
    if (exists) { sendError(res, 'A company with this slug already exists', 409); return; }

    const t = await sequelize.transaction();
    try {
      const company = await Company.create({
        name, slug, city: city||null, state: state||null, country: country||'India',
        industry: industry||null, email: email||null, phone: phone||null,
        timezone: timezone||'Asia/Kolkata', currency: currency||'INR',
        is_active: true, onboarding_step: 0, created_by: req.user!.employeeId,
      }, { transaction: t });

      const systemRoles = await Role.bulkCreate([
        { company_id:company.id, name:'Admin',              slug:'admin',     is_system:true },
        { company_id:company.id, name:'HR Manager',         slug:'hr',        is_system:true },
        { company_id:company.id, name:'Department Manager', slug:'mgr',       is_system:true },
        { company_id:company.id, name:'Employee',           slug:'emp',       is_system:true },
        { company_id:company.id, name:'Candidate',          slug:'candidate', is_system:true },
      ], { transaction: t, ignoreDuplicates: true });

      const adminRole = systemRoles.find(r => r.slug === 'admin')
        || await Role.findOne({ where: { company_id: company.id, slug: 'admin' } });

      await Department.bulkCreate([
        { company_id:company.id, name:'Human Resources', code:'HR'  },
        { company_id:company.id, name:'Engineering',     code:'ENG' },
        { company_id:company.id, name:'Finance',         code:'FIN' },
        { company_id:company.id, name:'Operations',      code:'OPS' },
      ], { transaction: t, ignoreDuplicates: true });

      const emailTaken = await User.findOne({ where: { email: admin_email.toLowerCase() } });
      if (emailTaken) throw new AppError(`Email ${admin_email} is already registered`, 409);

      await User.create({
        company_id: company.id, email: admin_email.toLowerCase(),
        password_hash: await hashPassword(admin_password),
        role_id: adminRole!.id, is_super_admin: false, is_active: true,
        created_by: req.user!.employeeId,
      }, { transaction: t });

      await company.update({ onboarding_step: 5, setup_completed_at: new Date() }, { transaction: t });
      await t.commit();

      await logActivity({ companyId: req.user!.companyId, employeeId: req.user!.employeeId, action: 'COMPANY_CREATED', module: 'companies', entityId: company.id, newValues: { name, slug, admin_email } });
      sendResponse(res, { data: { id: company.id, name: company.name, slug: company.slug }, statusCode: 201, message: `${name} created successfully` });
    } catch(e2) { await t.rollback(); throw e2; }
  } catch(e){ next(e); }
}

async function updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await Company.findByPk(+req.params.id);
    if (!company) { sendError(res, 'Company not found', 404); return; }
    await company.update(req.body);
    await logActivity({ companyId: req.user!.companyId, employeeId: req.user!.employeeId, action: 'COMPANY_UPDATED', module: 'companies', entityId: company.id });
    sendResponse(res, { data: company, message: 'Company updated' });
  } catch(e){ next(e); }
}

async function suspendCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await Company.findByPk(+req.params.id);
    if (!company) { sendError(res, 'Company not found', 404); return; }
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

// ─── Super Admin User Management ─────────────────────────────────────────────

async function listSuperAdmins(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admins = await User.findAll({
      where: { is_super_admin: true },
      attributes: ['id','email','is_active','last_login_at','created_at'],
      order: [['created_at','ASC']],
    });
    sendResponse(res, { data: admins });
  } catch(e){ next(e); }
}

async function createSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, full_name } = req.body;

    const exists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (exists) { sendError(res, 'Email already registered', 409); return; }

    // Get admin role for company 1
    const adminRole = await Role.findOne({ where: { company_id: 1, slug: 'admin' } });
    if (!adminRole) { sendError(res, 'Admin role not found for company 1. Run seeder first.', 500); return; }

    const newAdmin = await User.create({
      company_id:    1,
      email:         email.toLowerCase(),
      password_hash: await hashPassword(password),
      role_id:       adminRole.id,
      is_super_admin: true,
      is_active:     true,
      created_by:    req.user!.employeeId,
    });

    await logActivity({ companyId: 1, employeeId: req.user!.employeeId, action: 'SUPER_ADMIN_CREATED', module: 'super_admin', entityId: newAdmin.id, newValues: { email } });
    sendResponse(res, { data: { id: newAdmin.id, email: newAdmin.email }, statusCode: 201, message: 'Super admin created' });
  } catch(e){ next(e); }
}

async function updateSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const target = await User.findOne({ where: { id: +req.params.id, is_super_admin: true } });
    if (!target) { sendError(res, 'Super admin not found', 404); return; }

    const allowed = ['email'] as const;
    const updates: any = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    if (req.body.password) updates.password_hash = await hashPassword(req.body.password);

    await target.update(updates);
    sendResponse(res, { data: { id: target.id, email: target.email }, message: 'Updated' });
  } catch(e){ next(e); }
}

async function deactivateSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetId = +req.params.id;

    // Cannot deactivate yourself
    if (targetId === req.user!.employeeId) {
      sendError(res, 'You cannot deactivate your own super admin account', 400); return;
    }

    // System must always have at least one active super admin
    const activeCount = await User.count({ where: { is_super_admin: true, is_active: true } });
    if (activeCount <= 1) {
      sendError(res, 'Cannot deactivate: the system must always have at least one active super admin', 403); return;
    }

    const target = await User.findOne({ where: { id: targetId, is_super_admin: true } });
    if (!target) { sendError(res, 'Super admin not found', 404); return; }

    await target.update({ is_active: false });
    await logActivity({ companyId: 1, employeeId: req.user!.employeeId, action: 'SUPER_ADMIN_DEACTIVATED', module: 'super_admin', entityId: targetId });
    sendResponse(res, { data: { deactivated: true } });
  } catch(e){ next(e); }
}

async function reactivateSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const target = await User.findOne({ where: { id: +req.params.id, is_super_admin: true } });
    if (!target) { sendError(res, 'Super admin not found', 404); return; }
    await target.update({ is_active: true });
    sendResponse(res, { data: { activated: true } });
  } catch(e){ next(e); }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const adminRouter = Router();
adminRouter.use(authenticate);

// Platform stats
adminRouter.get('/platform-stats', getPlatformStats);

// Company management — permission-gated (not just super admins)
adminRouter.get   ('/companies',                listCompanies);
adminRouter.get   ('/companies/:id',            [param('id').isInt()], validate, getCompany);
adminRouter.post  ('/companies',               [body('name').trim().notEmpty(), body('admin_email').isEmail(), body('admin_password').isLength({min:8})], validate, createCompany);
adminRouter.put   ('/companies/:id',            [param('id').isInt()], validate, updateCompany);
adminRouter.post  ('/companies/:id/suspend',    [param('id').isInt()], validate, suspendCompany);
adminRouter.post  ('/companies/:id/activate',   [param('id').isInt()], validate, activateCompany);

// Super Admin management — super admin only
adminRouter.get   ('/super-admins',           requireSuperAdmin, listSuperAdmins);
adminRouter.post  ('/super-admins',           requireSuperAdmin, [body('email').isEmail(), body('password').isLength({min:8})], validate, createSuperAdmin);
adminRouter.put   ('/super-admins/:id',       requireSuperAdmin, [param('id').isInt()], validate, updateSuperAdmin);
adminRouter.post  ('/super-admins/:id/deactivate', requireSuperAdmin, [param('id').isInt()], validate, deactivateSuperAdmin);
adminRouter.post  ('/super-admins/:id/activate',   requireSuperAdmin, [param('id').isInt()], validate, reactivateSuperAdmin);
