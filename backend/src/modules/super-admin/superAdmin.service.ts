import { Op } from 'sequelize';
import { sequelize } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { Company } from '../../database/models/Company';
import { User } from '../../database/models/User';
import { Employee } from '../../database/models/Employee';
import { Department } from '../../database/models/Department';
import { Role } from '../../database/models/RoleModels';
import { hashPassword } from '../../utils/hash';
import { logActivity } from '../../utils/activityLogger';
import { generateAccessToken } from '../../utils/jwt';
import { AuthUser } from './superAdmin.types';
import {parsePaginationParams, buildPaginationMeta } from '../../utils/response';


// ─── Slug generator ───────────────────────────────────────────────────────────
function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export class CompanyService {
  async getPlatformStats() {
    const [total, active, totalUsers, totalEmployees] = await Promise.all([
      Company.count({ paranoid: false }),
      Company.count({ where: { is_active: true } }),
      User.count({ where: { is_super_admin: false } }),
      Employee.count(),
    ]);
    return { totalCompanies: total, activeCompanies: active, suspendedCompanies: total - active, totalUsers, totalEmployees };
  }

  async listCompanies(query: Record<string, any>) {
    const { page, limit, offset } = parsePaginationParams(query);
    const where: any = {};
    if (query.is_active !== undefined) where.is_active = query.is_active === 'true';
    if (query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query.search}%` } },
        { slug: { [Op.like]: `%${query.search}%` } },
        { email: { [Op.like]: `%${query.search}%` } },
      ];
    }
    const { count, rows } = await Company.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']], paranoid: false });
    const companyIds = rows.map(c => c.id);
    const [userCounts, empCounts] = await Promise.all([
      User.findAll({ where: { company_id: companyIds, is_super_admin: false }, attributes: ['company_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['company_id'], raw: true }),
      Employee.findAll({ where: { company_id: companyIds }, attributes: ['company_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['company_id'], raw: true }),
    ]);
    const uMap: Record<number, number> = {};
    const eMap: Record<number, number> = {};
    for (const r of userCounts as any[]) uMap[r.company_id] = Number(r.cnt);
    for (const r of empCounts as any[]) eMap[r.company_id] = Number(r.cnt);
    return { rows: rows.map(c => ({ ...c.toJSON(), live_user_count: uMap[c.id] || 0, live_employee_count: eMap[c.id] || 0 })), meta: buildPaginationMeta(page, limit, count) };
  }

  async getCompanyById(id: number) {
    const company = await Company.findByPk(id, { paranoid: false });
    if (!company) throw new AppError('Company not found', 404);
    const [userCount, empCount, roles] = await Promise.all([
      User.count({ where: { company_id: id, is_super_admin: false } }),
      Employee.count({ where: { company_id: id } }),
      Role.findAll({ where: { company_id: id }, attributes: ['id', 'name', 'slug', 'is_system'], order: [['is_system', 'DESC']] }),
    ]);
    return { ...company.toJSON(), live_user_count: userCount, live_employee_count: empCount, roles };
  }

  async createCompany(dto: any, createdBy?: number) {
    const slug = (dto.slug || toSlug(dto.name)).slice(0,100);
    const slugExists = await Company.findOne({ where: { slug }, paranoid: false });
    if (slugExists) throw new AppError('A company with this slug already exists', 409);

    const t = await sequelize.transaction();
    try {
      const company = await Company.create({
        name: dto.name, slug,
        city: dto.city || null, state: dto.state || null, country: dto.country || 'India',
        industry: dto.industry || null, email: dto.email || null, phone: dto.phone || null,
        max_employees: dto.max_employees || 100,
        timezone: dto.timezone || 'Asia/Kolkata', currency: dto.currency || 'INR',
        is_active: true, onboarding_step: 0, created_by: createdBy || null,
      }, { transaction: t });

      const roles = await Role.bulkCreate([
        { company_id: company.id, name: 'Admin', slug: 'admin', is_system: true },
        { company_id: company.id, name: 'HR Manager', slug: 'hr', is_system: true },
        { company_id: company.id, name: 'Department Manager', slug: 'mgr', is_system: true },
        { company_id: company.id, name: 'Employee', slug: 'emp', is_system: true },
        { company_id: company.id, name: 'Candidate', slug: 'candidate', is_system: true },
      ], { transaction: t, ignoreDuplicates: true });

      const adminRole = roles.find(r => r.slug === 'admin') || await Role.findOne({ where: { company_id: company.id, slug: 'admin' } });

      await Department.bulkCreate([
        { company_id: company.id, name: 'Human Resources', code: 'HR' },
        { company_id: company.id, name: 'Engineering', code: 'ENG' },
        { company_id: company.id, name: 'Finance', code: 'FIN' },
        { company_id: company.id, name: 'Operations', code: 'OPS' },
      ], { transaction: t, ignoreDuplicates: true });

      const emailExists = await User.findOne({ where: { email: dto.admin_email.toLowerCase() } });
      if (emailExists) throw new AppError(`Email ${dto.admin_email} already registered`, 409);

      await User.create({
        company_id: company.id, email: dto.admin_email.toLowerCase(),
        password_hash: await hashPassword(dto.admin_password),
        role_id: adminRole!.id, is_super_admin: false, is_active: true, created_by: createdBy || null,
      }, { transaction: t });

      await company.update({ onboarding_step: 5, setup_completed_at: new Date() }, { transaction: t });
      await t.commit();

      await logActivity({ companyId: 0, userId: createdBy, action: 'COMPANY_CREATED', module: 'companies', entityId: company.id, newValues: { name: company.name, slug, admin_email: dto.admin_email } });
      return this.getCompanyById(company.id);
    } catch (e) { await t.rollback(); throw e; }
  }

  async updateCompany(id: number, dto: any, updatedBy?: number) {
    const company = await Company.findByPk(id);
    if (!company) throw new AppError('Company not found', 404);
    await company.update(dto);
    await logActivity({ companyId: 0, userId: updatedBy, action: 'COMPANY_UPDATED', module: 'companies', entityId: id });
    return company;
  }

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