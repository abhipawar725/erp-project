/**
 * company-users.controller.ts
 *
 * Manages users and employees within a specific company.
 * Used by super admin to populate a company after creation.
 * Also used by company HR admins to manage their own users.
 *
 * Endpoints mounted at /api/admin/companies/:companyId/users
 *                  and /api/admin/companies/:companyId/employees
 */
import { Router, Request, Response, NextFunction } from 'express';
import { body, param }  from 'express-validator';
import { Op }           from 'sequelize';
import { sequelize }    from '../../config/database';
import { User }         from '../../database/models/User';
import { Employee }     from '../../database/models/Employee';
import { Role }         from '../../database/models/RoleModels';
import { Department }   from '../../database/models/Department';
import { Designation }  from '../../database/models/Designation';
import { Company }      from '../../database/models/Company';
import { AppError }     from '../../middleware/errorHandler.middleware';
import { authenticate, authorize, requireSuperAdmin } from '../auth/auth.middleware';
import { validate }     from '../../middleware/validate.middleware';
import { hashPassword } from '../../utils/hash';
import { logActivity }  from '../../utils/activityLogger';
import { sendResponse, sendError, parsePaginationParams, buildPaginationMeta } from '../../utils/response';

// ─── Guard: caller must be super admin OR belong to the target company ─────────
function requireCompanyAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const targetCompanyId = +req.params.companyId;
  // Super admin can access any company
  if (req.user.isSuperAdmin) { next(); return; }
  // Company HR/admin can only access their own company
  if (req.user.companyId === targetCompanyId && (req.user.roleSlug === 'hr' || req.user.roleSlug === 'admin')) {
    next(); return;
  }
  sendError(res, 'Forbidden: You can only manage your own company', 403);
}

// ─── Helper: generate next employee code ──────────────────────────────────────
async function nextEmployeeCode(companyId: number): Promise<string> {
  const count = await Employee.count({ where: { company_id: companyId } });
  const company = await Company.findByPk(companyId, { attributes: ['slug'] });
  const prefix = (company?.slug || 'EMP').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'E');
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/companies/:companyId/users
async function listCompanyUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = +req.params.companyId;
    const { page, limit, offset } = parsePaginationParams(req.query as any);

    const where: any = { company_id: companyId, is_super_admin: false };
    if (req.query.search) {
      where.email = { [Op.like]: `%${req.query.search}%` };
    }
    if (req.query.role_id) where.role_id = +req.query.role_id;

    const { count, rows } = await User.findAndCountAll({
      where, limit, offset,
      attributes: { exclude: ['password_hash', 'refresh_token', 'reset_token', 'reset_expires'] },
      include: [
        { model: Role,     as: 'role',     attributes: ['id', 'name', 'slug'] },
        { model: Employee, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_code', 'department_id', 'designation_id'], required: false },
      ],
      order: [['created_at', 'DESC']],
    });

    sendResponse(res, {
      data: {
        rows: rows.map(u => ({
          ...u.toJSON(),
          has_employee_record: !!(u as any).employee,
          full_name: (u as any).employee
            ? `${(u as any).employee.first_name} ${(u as any).employee.last_name}`
            : null,
        })),
        meta: buildPaginationMeta(page, limit, count),
      },
    });
  } catch(e){ next(e); }
}

// POST /api/admin/companies/:companyId/users
// Creates a login user for the company (no employee record yet)
async function createCompanyUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = +req.params.companyId;
    const { email, password, role_slug = 'emp' } = req.body;

    const company = await Company.findByPk(companyId);
    if (!company) { sendError(res, 'Company not found', 404); return; }

    const emailTaken = await User.findOne({ where: { email: email.toLowerCase() } });
    if (emailTaken) { sendError(res, 'This email is already registered', 409); return; }

    const role = await Role.findOne({ where: { company_id: companyId, slug: role_slug } });
    if (!role) { sendError(res, `Role "${role_slug}" not found in this company`, 404); return; }

    const user = await User.create({
      company_id:    companyId,
      email:         email.toLowerCase(),
      password_hash: await hashPassword(password),
      role_id:       role.id,
      is_super_admin: false,
      is_active:     true,
      created_by:    req.user!.employeeId,
    });

    await logActivity({ companyId, employeeId: req.user!.employeeId, action: 'USER_CREATED', module: 'users', entityId: user.id, newValues: { email, role_slug } });

    sendResponse(res, {
      data: { id: user.id, email: user.email, role_slug, has_employee_record: false },
      statusCode: 201,
      message: `User ${email} created. Convert to employee to assign HR permissions.`,
    });
  } catch(e){ next(e); }
}

// PUT /api/admin/companies/:companyId/users/:employeeId/role
// Change a user's role
async function changeUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = +req.params.companyId;
    const { role_slug } = req.body;

    const user = await User.findOne({ where: { id: +req.params.employeeId, company_id: companyId } });
    if (!user) { sendError(res, 'User not found', 404); return; }

    const role = await Role.findOne({ where: { company_id: companyId, slug: role_slug } });
    if (!role) { sendError(res, `Role "${role_slug}" not found`, 404); return; }

    const oldRole = user.role_id;
    await user.update({ role_id: role.id });

    await logActivity({ companyId, employeeId: req.user!.employeeId, action: 'USER_ROLE_CHANGED', module: 'users', entityId: user.id, oldValues: { role_id: oldRole }, newValues: { role_slug } });
    sendResponse(res, { data: { id: user.id, email: user.email, new_role: role_slug }, message: 'Role updated' });
  } catch(e){ next(e); }
}

// DELETE /api/admin/companies/:companyId/users/:employeeId
async function deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({ where: { id: +req.params.employeeId, company_id: +req.params.companyId } });
    if (!user) { sendError(res, 'User not found', 404); return; }
    await user.update({ is_active: false });
    sendResponse(res, { data: { deactivated: true } });
  } catch(e){ next(e); }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/admin/companies/:companyId/users/:employeeId/convert-to-employee
// THE KEY ENDPOINT: converts an existing login user into an employee record
// This is what makes them appear in employee lists and permission assignment UIs
async function convertUserToEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = +req.params.companyId;
    const employeeId    = +req.params.employeeId;

    const user = await User.findOne({ where: { id: employeeId, company_id: companyId } });
    if (!user) { sendError(res, 'User not found', 404); return; }
    if (user.employee_id) { sendError(res, 'User already has an employee record', 409); return; }

    const {
      first_name, last_name,
      department_id, designation_id,
      date_of_joining, phone, gender,
      employment_type = 'Full_Time',
    } = req.body;

    if (!first_name || !last_name) {
      sendError(res, 'first_name and last_name are required', 400);
      return;
    }

    const t = await sequelize.transaction();
    try {
      const employee_code = await nextEmployeeCode(companyId);

      // Create the employee record
      const employee = await Employee.create({
        company_id:      companyId,
        employee_code,
        first_name,
        last_name,
        email:           user.email,          // same email as login
        department_id:   department_id || null,
        designation_id:  designation_id || null,
        phone:           phone || null,
        employment_type,
        status:          'Active',
        created_by:      req.user!.employeeId,
      }, { transaction: t });

      // Link the user to the employee record (bidirectional)
      await user.update({ employee_id: employee.id }, { transaction: t });

      await t.commit();

      await logActivity({
        companyId, employeeId: req.user!.employeeId,
        action: 'USER_CONVERTED_TO_EMPLOYEE',
        module: 'employees',
        entityId: employee.id,
        newValues: { user_id: employeeId, employee_code, full_name: `${first_name} ${last_name}` },
      });

      sendResponse(res, {
        data: {
          employee_id:   employee.id,
          employee_code,
          full_name:     `${first_name} ${last_name}`,
          user_id:       user.id,
          email:         user.email,
        },
        statusCode: 201,
        message: `${first_name} ${last_name} is now an employee (${employee_code}) and will appear in all employee lists and permission assignments.`,
      });
    } catch(e2){ await t.rollback(); throw e2; }
  } catch(e){ next(e); }
}

// POST /api/admin/companies/:companyId/employees
// Create an employee directly (also creates a user login if email provided)
async function createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = +req.params.companyId;
    const {
      first_name, last_name, email,
      department_id, designation_id,
      date_of_joining, phone, gender,
      employment_type = 'Full_Time',
      // Optional: create login at same time
      create_login = false,
      login_password,
      role_slug = 'emp',
    } = req.body;

    if (!first_name || !last_name || !email) {
      sendError(res, 'first_name, last_name, and email are required', 400);
      return;
    }

    const company = await Company.findByPk(companyId);
    if (!company) { sendError(res, 'Company not found', 404); return; }

    // Check if employee with this email already exists
    const existing = await Employee.findOne({ where: { email: email.toLowerCase(), company_id: companyId } });
    if (existing) { sendError(res, 'An employee with this email already exists in this company', 409); return; }

    const t = await sequelize.transaction();
    try {
      const employee_code = await nextEmployeeCode(companyId);

      const employee = await Employee.create({
        company_id:      companyId,
        employee_code,
        first_name,
        last_name,
        email:           email.toLowerCase(),
        department_id:   department_id || null,
        designation_id:  designation_id || null,
        phone:           phone || null,
        employment_type,
        status:          'Active',
        created_by:      req.user!.employeeId,
      }, { transaction: t });

      let employeeId: number | null = null;

      // Optionally create a login account at the same time
      if (create_login && login_password) {
        const emailTaken = await User.findOne({ where: { email: email.toLowerCase() } });
        if (emailTaken) {
          // Email already has a user — just link the employee record to them
          await emailTaken.update({ employee_id: employee.id }, { transaction: t });
          employeeId = emailTaken.id;
        } else {
          const role = await Role.findOne({ where: { company_id: companyId, slug: role_slug } });
          if (!role) throw new AppError(`Role "${role_slug}" not found in this company`, 404);

          const user = await User.create({
            company_id:    companyId,
            email:         email.toLowerCase(),
            password_hash: await hashPassword(login_password),
            role_id:       role.id,
            employee_id:   employee.id,
            is_super_admin: false,
            is_active:     true,
            created_by:    req.user!.employeeId,
          }, { transaction: t });

          employeeId = user.id;
        }
      }

      await t.commit();

      await logActivity({
        companyId, employeeId: req.user!.employeeId,
        action: 'EMPLOYEE_CREATED',
        module: 'employees',
        entityId: employee.id,
        newValues: { employee_code, full_name: `${first_name} ${last_name}`, email, user_created: !!employeeId },
      });

      sendResponse(res, {
        data: {
          id:            employee.id,
          employee_code,
          full_name:     `${first_name} ${last_name}`,
          email:         email.toLowerCase(),
          user_id:       employeeId,
          has_login:     !!employeeId,
        },
        statusCode: 201,
        message: employeeId
          ? `Employee ${employee_code} created with login account. They can now log in and will appear in all lists.`
          : `Employee ${employee_code} created. Add a login account later to give portal access.`,
      });
    } catch(e2){ await t.rollback(); throw e2; }
  } catch(e){ next(e); }
}

// POST /api/admin/companies/:companyId/employees/:employeeId/create-login
// Add a login to an existing employee who doesn't have one yet
async function createLoginForEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId  = +req.params.companyId;
    const employeeId = +req.params.employeeId;
    const { password, role_slug = 'emp' } = req.body;

    const employee = await Employee.findOne({
      where: { id: employeeId, company_id: companyId },
    });
    if (!employee) { sendError(res, 'Employee not found', 404); return; }

    // Check if user already exists for this email
    const existingUser = await User.findOne({ where: { email: employee.email } });
    if (existingUser) {
      // Just link them if not already linked
      if (!existingUser.employee_id) {
        await existingUser.update({ employee_id: employeeId });
        sendResponse(res, { data: { user_id: existingUser.id, linked: true }, message: 'Existing account linked to employee' });
      } else {
        sendError(res, 'This employee already has a login account', 409);
      }
      return;
    }

    const role = await Role.findOne({ where: { company_id: companyId, slug: role_slug } });
    if (!role) { sendError(res, `Role "${role_slug}" not found`, 404); return; }

    const user = await User.create({
      company_id:    companyId,
      email:         employee.email,
      password_hash: await hashPassword(password),
      role_id:       role.id,
      employee_id:   employeeId,
      is_super_admin: false,
      is_active:     true,
      created_by:    req.user!.employeeId,
    });

    sendResponse(res, {
      data: { user_id: user.id, email: user.email, employee_code: employee.employee_code },
      statusCode: 201,
      message: `Login created for ${employee.first_name} ${employee.last_name}`,
    });
  } catch(e){ next(e); }
}

// GET /api/admin/companies/:companyId/employees
// List employees for a company (used in permission assignment UIs)
async function listCompanyEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = +req.params.companyId;
    const { page, limit, offset } = parsePaginationParams(req.query as any);

    const where: any = { company_id: companyId };
    if (req.query.search) {
      where[Op.or] = [
        { first_name:    { [Op.like]: `%${req.query.search}%` } },
        { last_name:     { [Op.like]: `%${req.query.search}%` } },
        { email:         { [Op.like]: `%${req.query.search}%` } },
        { employee_code: { [Op.like]: `%${req.query.search}%` } },
      ];
    }
    if (req.query.department_id) where.department_id = +req.query.department_id;
    if (req.query.status) where.status = req.query.status;

    const { count, rows } = await Employee.findAndCountAll({
      where, limit, offset,
      include: [
        { model: Department,  as: 'department',  attributes: ['id', 'name'], required: false },
        { model: Designation, as: 'designation', attributes: ['id', 'name'], required: false },
        {
          model: User, as: 'user',
          attributes: ['id', 'email', 'role_id', 'is_active'],
          include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'slug'] }],
          required: false,
        },
      ],
      order: [['first_name', 'ASC']],
    });

    sendResponse(res, {
      data: {
        rows: rows.map(e => ({
          ...e.toJSON(),
          full_name:  `${e.first_name} ${e.last_name}`,
          has_login:  !!(e as any).user,
          role:       (e as any).user?.role || null,
        })),
        meta: buildPaginationMeta(page, limit, count),
      },
    });
  } catch(e){ next(e); }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const companyUsersRouter = Router({ mergeParams: true });
companyUsersRouter.use(authenticate, requireCompanyAccess);

// Users
companyUsersRouter.get   ('/',              listCompanyUsers);
companyUsersRouter.post  ('/',              [body('email').isEmail(), body('password').isLength({min:6}), body('role_slug').optional().isString()], validate, createCompanyUser);
companyUsersRouter.put   ('/:employeeId/role',  [param('employeeId').isInt(), body('role_slug').notEmpty()], validate, changeUserRole);
companyUsersRouter.delete('/:employeeId',       [param('employeeId').isInt()], validate, deactivateUser);
// Convert user → employee (THE KEY ENDPOINT)
companyUsersRouter.post  ('/:employeeId/convert-to-employee', [param('employeeId').isInt(), body('first_name').trim().notEmpty(), body('last_name').trim().notEmpty()], validate, convertUserToEmployee);

export const companyEmployeesRouter = Router({ mergeParams: true });
companyEmployeesRouter.use(authenticate, requireCompanyAccess);

// Employees
companyEmployeesRouter.get   ('/',                             listCompanyEmployees);
companyEmployeesRouter.post  ('/',                             [body('first_name').trim().notEmpty(), body('last_name').trim().notEmpty(), body('email').isEmail()], validate, createEmployee);
companyEmployeesRouter.post  ('/:employeeId/create-login',    [param('employeeId').isInt(), body('password').isLength({min:6})], validate, createLoginForEmployee);
