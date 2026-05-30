/**
 * Super Admin — Company Management Module
 *
 * Only the super admin (is_super_admin=true) can access these endpoints.
 * These routes are completely outside the tenant system — they operate
 * across ALL companies.
 *
 * Endpoints:
 *   GET    /api/super/companies               list all companies
 *   POST   /api/super/companies               create + onboard new company
 *   GET    /api/super/companies/:id           company detail + stats
 *   PUT    /api/super/companies/:id           update company settings
 *   DELETE /api/super/companies/:id           soft-delete company
 *   POST   /api/super/companies/:id/activate  reactivate company
 *   POST   /api/super/companies/:id/suspend   suspend company
 *   POST   /api/super/companies/seed/:id      seed default data for company
 *   GET    /api/super/stats                   platform-level stats
 */
import { Router, Request, Response, NextFunction } from 'express';
import { body, param }   from 'express-validator';
import { Op }            from 'sequelize';
import { sequelize }     from '../../config/database';
import { Company }       from '../../database/models/Company';
import { User }          from '../../database/models/User';
import { Role }          from '../../database/models/RoleModels';
import { Employee }      from '../../database/models/Employee';
import { Department }    from '../../database/models/Department';
import { AppError }      from '../../middleware/errorHandler.middleware';
import { authenticate }  from '../../middleware/auth.middleware';
import { validate }      from '../../middleware/validate.middleware';
import { sendResponse, sendError, sendPaginated, parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { hashPassword }  from '../../utils/hash';
import { logActivity }   from '../../utils/activityLogger';

// ─── Super admin guard middleware ─────────────────────────────────────────────
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  if (!req.user.isSuperAdmin) {
    sendError(res, 'Forbidden: Super admin access required', 403);
    return;
  }
  next();
}

// ─── Slug generator ───────────────────────────────────────────────────────────
function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Company Service ──────────────────────────────────────────────────────────
class CompanyService {

  // ── Platform stats ────────────────────────────────────────────────────────
  async getPlatformStats() {
    const [
      totalCompanies, activeCompanies, totalUsers, totalEmployees,
    ] = await Promise.all([
      Company.count({ paranoid: false }),
      Company.count({ where: { is_active: true } }),
      User.count({ where: { is_super_admin: false } }),
      Employee.count(),
    ]);

    return {
      totalCompanies, activeCompanies,
      suspendedCompanies: totalCompanies - activeCompanies,
      totalUsers, totalEmployees,
    };
  }

  // ── List all companies ────────────────────────────────────────────────────
  async listCompanies(query: Record<string, any>) {
    const { page, limit, offset } = parsePaginationParams(query);
    const where: any = {};
    if (query.is_active !== undefined) where.is_active = query.is_active === 'true';
    if (query.search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${query.search}%` } },
        { slug:  { [Op.like]: `%${query.search}%` } },
        { email: { [Op.like]: `%${query.search}%` } },
        { city:  { [Op.like]: `%${query.search}%` } },
      ];
    }

    const { count, rows } = await Company.findAndCountAll({
      where, limit, offset,
      order: [['created_at', 'DESC']],
      paranoid: false,
    });

    // Enrich with live user + employee counts
    const companyIds = rows.map(c => c.id);
    const [userCounts, empCounts] = await Promise.all([
      User.findAll({
        where: { company_id: companyIds, is_super_admin: false },
        attributes: ['company_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        group: ['company_id'], raw: true,
      }),
      Employee.findAll({
        where: { company_id: companyIds },
        attributes: ['company_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        group: ['company_id'], raw: true,
      }),
    ]);

    const uMap: Record<number, number> = {};
    const eMap: Record<number, number> = {};
    for (const r of userCounts as any[]) uMap[r.company_id] = Number(r.cnt);
    for (const r of empCounts  as any[]) eMap[r.company_id] = Number(r.cnt);

    const enriched = rows.map(c => ({
      ...c.toJSON(),
      live_user_count:     uMap[c.id] || 0,
      live_employee_count: eMap[c.id] || 0,
    }));

    return { rows: enriched, meta: buildPaginationMeta(page, limit, count) };
  }

  // ── Get company detail ────────────────────────────────────────────────────
  async getCompanyById(id: number) {
    const company = await Company.findByPk(id, { paranoid: false });
    if (!company) throw new AppError('Company not found', 404);

    const [userCount, empCount, roles] = await Promise.all([
      User.count({ where: { company_id: id, is_super_admin: false } }),
      Employee.count({ where: { company_id: id } }),
      Role.findAll({ where: { company_id: id }, attributes: ['id','name','slug','is_system'], order: [['is_system','DESC']] }),
    ]);

    return { ...company.toJSON(), live_user_count: userCount, live_employee_count: empCount, roles };
  }

  // ── Create company + seed defaults ────────────────────────────────────────
  async createCompany(dto: {
    name: string; slug?: string; city?: string; state?: string;
    country?: string; industry?: string; email?: string; phone?: string;
    max_employees?: number;
    timezone?: string; currency?: string;
    admin_email: string; admin_password: string; admin_name?: string;
  }, createdBy?: number) {
    const slug = dto.slug || toSlug(dto.name);

    const slugExists = await Company.findOne({ where: { slug }, paranoid: false });
    if (slugExists) throw new AppError('A company with this slug already exists', 409);

    const t = await sequelize.transaction();
    try {
      // 1. Create company
      const company = await Company.create({
        name:              dto.name,
        slug,
        city:              dto.city || null,
        state:             dto.state || null,
        country:           dto.country || 'India',
        industry:          dto.industry || null,
        email:             dto.email || null,
        phone:             dto.phone || null,
        max_employees:     dto.max_employees || 100,
        timezone:          dto.timezone || 'Asia/Kolkata',
        currency:          dto.currency || 'INR',
        is_active:         true,
        onboarding_step:   0,
        created_by:        createdBy || null,
      }, { transaction: t });

      // 2. Seed system roles
      const systemRoles = await Role.bulkCreate([
        { company_id: company.id, name: 'Admin',              slug: 'admin',     is_system: true },
        { company_id: company.id, name: 'HR Manager',         slug: 'hr',        is_system: true },
        { company_id: company.id, name: 'Department Manager', slug: 'mgr',       is_system: true },
        { company_id: company.id, name: 'Employee',           slug: 'emp',       is_system: true },
        { company_id: company.id, name: 'Candidate',          slug: 'candidate', is_system: true },
      ], { transaction: t, ignoreDuplicates: true });

      const adminRole = systemRoles.find(r => r.slug === 'admin') ||
        await Role.findOne({ where: { company_id: company.id, slug: 'admin' } });

      // 3. Seed default departments
      await Department.bulkCreate([
        { company_id: company.id, name: 'Human Resources', code: 'HR' },
        { company_id: company.id, name: 'Engineering',     code: 'ENG' },
        { company_id: company.id, name: 'Finance',         code: 'FIN' },
        { company_id: company.id, name: 'Operations',      code: 'OPS' },
      ], { transaction: t, ignoreDuplicates: true });

      // 4. Create company admin user
      const emailExists = await User.findOne({ where: { email: dto.admin_email.toLowerCase() } });
      if (emailExists) throw new AppError(`Email ${dto.admin_email} is already registered`, 409);

      const passwordHash = await hashPassword(dto.admin_password);
      await User.create({
        company_id:    company.id,
        email:         dto.admin_email.toLowerCase(),
        password_hash: passwordHash,
        role_id:       adminRole!.id,
        is_super_admin: false,
        is_active:     true,
        created_by:    createdBy || null,
      }, { transaction: t });

      // 5. Mark onboarding complete
      await company.update({ onboarding_step: 5, setup_completed_at: new Date() }, { transaction: t });

      await t.commit();

      await logActivity({
        companyId: createdBy ? 0 : company.id,
        userId:    createdBy,
        action:    'COMPANY_CREATED',
        module:    'companies',
        entityId:  company.id,
        newValues: { name: company.name, slug, admin_email: dto.admin_email },
      });

      return this.getCompanyById(company.id);
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  // ── Update company ────────────────────────────────────────────────────────
  async updateCompany(id: number, dto: any, updatedBy?: number) {
    const company = await Company.findByPk(id);
    if (!company) throw new AppError('Company not found', 404);
    const oldValues = { name: company.name, is_active: company.is_active };
    await company.update(dto);
    await logActivity({ companyId: 0, userId: updatedBy, action: 'COMPANY_UPDATED', module: 'companies', entityId: id, oldValues, newValues: dto });
    return company;
  }

  // ── Suspend / Activate ────────────────────────────────────────────────────
  async suspend(id: number, updatedBy?: number) {
    const company = await Company.findByPk(id);
    if (!company) throw new AppError('Company not found', 404);
    await company.update({ is_active: false });
    await logActivity({ companyId: 0, userId: updatedBy, action: 'COMPANY_SUSPENDED', module: 'companies', entityId: id });
    return { suspended: true };
  }

  async activate(id: number, updatedBy?: number) {
    const company = await Company.findByPk(id, { paranoid: false });
    if (!company) throw new AppError('Company not found', 404);
    await company.update({ is_active: true, deleted_at: null });
    await logActivity({ companyId: 0, userId: updatedBy, action: 'COMPANY_ACTIVATED', module: 'companies', entityId: id });
    return { activated: true };
  }
}

const companySvc = new CompanyService();

// ─── Controllers ──────────────────────────────────────────────────────────────

async function getPlatformStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.getPlatformStats() }); } catch(e){ next(e); }
}

async function listCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, meta } = await companySvc.listCompanies(req.query as any);
    sendPaginated(res, rows, meta);
  } catch(e){ next(e); }
}

async function getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.getCompanyById(+req.params.id) }); } catch(e){ next(e); }
}

async function createCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.createCompany(req.body, req.user!.userId), statusCode: 201, message: 'Company created successfully' }); } catch(e){ next(e); }
}

async function updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.updateCompany(+req.params.id, req.body, req.user!.userId) }); } catch(e){ next(e); }
}

async function suspendCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.suspend(+req.params.id, req.user!.userId) }); } catch(e){ next(e); }
}

async function activateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.activate(+req.params.id, req.user!.userId) }); } catch(e){ next(e); }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const superAdminRouter = Router();
superAdminRouter.use(authenticate, requireSuperAdmin);

superAdminRouter.get('/stats',                getPlatformStats);
superAdminRouter.get('/companies',            listCompanies);
superAdminRouter.get('/companies/:id',        [param('id').isInt()], validate, getCompany);
superAdminRouter.post('/companies',           [body('name').trim().notEmpty(), body('admin_email').isEmail(), body('admin_password').isLength({min:8})], validate, createCompany);
superAdminRouter.put('/companies/:id',        [param('id').isInt()], validate, updateCompany);
superAdminRouter.post('/companies/:id/suspend', [param('id').isInt()], validate, suspendCompany);
superAdminRouter.post('/companies/:id/activate',[param('id').isInt()], validate, activateCompany);
