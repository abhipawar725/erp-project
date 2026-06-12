import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { Employee, EmployeeRole, OtpRequest, Role, RoleModulePermission, PermissionGroup, GroupPermission, UserGroup, Permission } from '../../database/models/index';
import { CompanyManager }  from '../../database/models/CompanyManager';
import { Company }         from '../../database/models/Company';
import { AppError } from '../../middleware/errorHandler.middleware';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { logActivity } from '../../utils/activityLogger';
import { otpService } from '../../utils/otpService';
import { normalizePhone } from '../../utils/normalizeNumber';

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;
const OTP_LOCK_MS = 15 * 60 * 1000;
const OTP_RATE_LIMIT = 50;
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export async function isCompanySuperAdmin(
  employeeId: number,
  companyId:  number,
): Promise<boolean> {
  // Platform-level super admin always qualifies
  const employee = await Employee.findByPk(employeeId, { attributes: ['id','is_super_admin'] });
  if (employee?.is_super_admin) return true;

  // Check if they have the super_admin role in this specific company
  const empRole = await EmployeeRole.findOne({
    where:   { employee_id: employeeId, company_id: companyId },
    include: [{
      model: Role, as: 'role',
      where: { slug: 'super_admin', company_id: companyId },
      required: true,
    }],
  });
  return !!empRole;
}

export async function countCompanySuperAdmins(companyId: number): Promise<number> {
  const saRole = await Role.findOne({ where: { company_id: companyId, slug: 'super_admin' } });
  if (!saRole) return 0;

  return EmployeeRole.count({
    where: { role_id: saRole.id, company_id: companyId },
    include: [{
      model: Employee, as: 'employee',
      where: { portal_access: true, deleted_at: null },
      required: true,
    }] as any,
  });
}

async function loadPermissions(
  employeeId: number,
  companyId: number
): Promise<{permissions: string[]; isSuperAdmin: boolean}> {

    // Platform super admin → wildcard
  const employee = await Employee.findByPk(employeeId, { attributes: ['id','is_super_admin'] });
  if (employee?.is_super_admin) {
    return { permissions: ['*'], isSuperAdmin: true };
  }

  // Company-level super admin → wildcard for THIS company
  const saRole = await Role.findOne({ where: { company_id: companyId, slug: 'super_admin' } });
  if (saRole) {
    const isSA = await EmployeeRole.findOne({
      where: { employee_id: employeeId, role_id: saRole.id, company_id: companyId },
    });
    if (isSA) return { permissions: ['*'], isSuperAdmin: true };
  }
  
  // Regular role → load module permissions
  const slugs = new Set<string>();
  
  // Source 1: role_module_permissions
  const empRoles = await EmployeeRole.findAll({
    where:   { employee_id: employeeId, company_id: companyId },
    include: [{
      model: Role, as: 'role',
      include: [{ model: RoleModulePermission, as: 'modulePermissions' }],
    }],
  });
  for (const er of empRoles) {
    for (const p of ((er as any).role?.modulePermissions ?? [])) {
      if (p.can_view)    slugs.add(`${p.module}:view`);
      if (p.can_create)  slugs.add(`${p.module}:create`);
      if (p.can_edit)    slugs.add(`${p.module}:edit`);
      if (p.can_delete)  slugs.add(`${p.module}:delete`);
      if (p.can_approve) slugs.add(`${p.module}:approve`);
      if (p.can_export)  slugs.add(`${p.module}:export`);
    }
  }  

    // Source 2: group permissions
  const userGroups = await UserGroup.findAll({
    where: { employee_id: employeeId, company_id: companyId },
    include: [{
      model: PermissionGroup, as: 'group', where: { is_active: true },
      include: [{ model: Permission, as: 'permissions', through: { attributes: [] }, attributes: ['slug'] }],
      required: false,
    }],
  });
  for (const ug of userGroups) {
    for (const p of ((ug as any).group?.permissions ?? [])) {
      if (p.slug) slugs.add(p.slug);
    }
  }

  return { permissions: [...slugs], isSuperAdmin: false };
}

// async function buildPayload(employee: Employee) {
//   const permissions = employee.is_super_admin
//     ? ['*']
//     : await loadPermissions(employee.id, employee.company_id);
//   const empRole = await EmployeeRole.findOne({
//     where: { employee_id: employee.id, company_id: employee.company_id },
//     include: [{ model: Role, as: 'role' }],
//   });
//   const role = (empRole as any)?.role;
//   return { employeeId: employee.id, companyId: employee.company_id, roleId: role?.id ?? 0, roleSlug: role?.slug ?? 'employee', email: employee.email, isSuperAdmin: employee.is_super_admin, permissions };
// }

async function buildPayload(employee: Employee, activeCompanyId?: number) {
  const companyId = activeCompanyId || employee.company_id;
  const { permissions, isSuperAdmin } = await loadPermissions(employee.id, companyId);

  const empRole = await EmployeeRole.findOne({
    where:   { employee_id: employee.id, company_id: companyId },
    include: [{ model: Role, as: 'role' }],
  });
  const role = (empRole as any)?.role;

  return {
    employeeId:   employee.id,
    companyId,
    roleId:       role?.id   ?? 0,
    roleSlug:     role?.slug ?? 'employee',
    email:        employee.email,
    isSuperAdmin: employee.is_super_admin || isSuperAdmin,
    permissions,
  };
}

async function buildResponse(employee: Employee, payload: Awaited<ReturnType<typeof buildPayload>>) {
  const assignments = await CompanyManager.findAll({
    where:   { employee_id: employee.id },
    include: [{ model: Company, as: 'company', attributes: ['id','name','slug','is_active'] }],
    order:   [['is_primary','DESC'],['assigned_at','ASC']],
  });

  // For each managed company, check if they are super admin there
  const managedCompanies = await Promise.all(
    assignments.map(async a => {
      const co      = (a as any).company;
      const isSA    = await isCompanySuperAdmin(employee.id, a.company_id);
      const empRole = await EmployeeRole.findOne({
        where:   { employee_id: employee.id, company_id: a.company_id },
        include: [{ model: Role, as: 'role', attributes: ['id','name','slug'] }],
      });
      return {
        id:              co.id,
        name:            co.name,
        slug:            co.slug,
        is_active:       co.is_active,
        manager_role:    (empRole as any)?.role?.slug  || null,
        role_name:       (empRole as any)?.role?.name  || null,
        is_primary:      a.is_primary,
        is_super_admin:  isSA,   // ← per-company super admin flag
      };
    })
  );

  // If no managed companies, include home company
  if (managedCompanies.length === 0) {
    const home = await Company.findByPk(employee.company_id, { attributes: ['id','name','slug','is_active'] });
    if (home) {
      managedCompanies.push({
        id: home.id, name: home.name, slug: home.slug, is_active: home.is_active,
        manager_role: payload.roleSlug, role_name: null,
        is_primary: true, is_super_admin: payload.isSuperAdmin,
      });
    }
  }

  return {
    id:               employee.id,
    employeeId:       employee.id,
    email:            employee.email,
    fullName:         `${employee.first_name} ${employee.last_name}`,
    firstName:        employee.first_name,
    lastName:         employee.last_name,
    avatarUrl:        employee.avatar_url ?? null,
    companyId:        employee.company_id,
    roleId:           payload.roleId,
    roleSlug:         payload.roleSlug,
    isSuperAdmin:     employee.is_super_admin,       // platform-level flag
    permissions:      payload.permissions,
    managedCompanies,
  };
}

export class AuthService {

  async requestOtp(emailOrPhone: string, channel: 'email' | 'sms' = 'email', ipAddress?: string) {
    const loginValue = emailOrPhone.trim();
    const isPhone = /^\+?[0-9]{10,15}$/.test(emailOrPhone.trim());
    const normalizedPhone = normalizePhone(loginValue);
    const normalizedEmail = loginValue.toLowerCase();
    const employee = await Employee.findOne({
      where: { [Op.or]: isPhone ? [{ phone: normalizedPhone }] : [{ email: normalizedEmail }], portal_access: true },
    });
    if (!employee) {
      throw new AppError('User not found.', 404);
    }

    if (employee.otp_locked_until && new Date() < employee.otp_locked_until) {
      const mins = Math.ceil((employee.otp_locked_until.getTime() - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`, 429);
    }

    const recentCount = await OtpRequest.count({ where: { employee_id: employee.id, requested_at: { [Op.gte]: new Date(Date.now() - 3600000) } } });
    if (recentCount >= OTP_RATE_LIMIT) throw new AppError('Too many OTP requests. Wait 1 hour.', 429);

    // const otp = process.env.NODE_ENV === 'production' ? String(Math.floor(100000 + Math.random() * 900000)) : '123456';
    const otp = '123456'
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await employee.update({ otp_hash: otpHash, otp_expires: expiresAt, otp_attempts: 0, otp_locked_until: null });
    await OtpRequest.create({ employee_id: employee.id, channel: isPhone ? 'sms' : 'email', ip_address: ipAddress ?? null, expires_at: expiresAt });

    // await otpService.send({ channel: isPhone ? 'sms' : 'email', destination: isPhone ? emailOrPhone.trim() : employee.email, otp, employeeId: employee.id });

    return { message: 'If an account exists, an OTP has been sent.', expires_in: 600 };
  }

  async verifyOtp(emailOrPhone: string, otp: string = '123456', ipAddress?: string) {
    const loginValue = emailOrPhone.trim();
    const isPhone = /^\+?[0-9]{10,15}$/.test(emailOrPhone.trim());
    const normalizedPhone = normalizePhone(loginValue);
    const normalizedEmail = loginValue.toLowerCase();
    const employee = await Employee.findOne({
      where: { [Op.or]: isPhone ? [{ phone: normalizedPhone }] : [{ email: normalizedEmail }] },
    });
    if (!employee) throw new AppError('Invalid credentials.', 401);
    if (!employee.portal_access) throw new AppError('Portal access disabled. Contact HR.', 403);

    if (employee.otp_locked_until && new Date() < employee.otp_locked_until) {
      const mins = Math.ceil((employee.otp_locked_until.getTime() - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`, 429);
    }
    if (!employee.otp_hash || !employee.otp_expires) throw new AppError('No OTP found. Request a new one.', 400);
    if (new Date() > employee.otp_expires) {
      await employee.update({ otp_hash: null, otp_expires: null, otp_attempts: 0 });
      throw new AppError('OTP expired. Request a new one.', 410);
    }

    const isValid = await bcrypt.compare(otp, employee.otp_hash);
    if (!isValid) {
      const attempts = employee.otp_attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await employee.update({ otp_attempts: attempts, otp_locked_until: new Date(Date.now() + OTP_LOCK_MS), otp_hash: null, otp_expires: null });
        throw new AppError('Too many failed attempts. Locked for 15 minutes.', 429);
      }
      await employee.update({ otp_attempts: attempts });
      const left = OTP_MAX_ATTEMPTS - attempts;
      throw new AppError(`Invalid OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.`, 401);
    }

    await OtpRequest.update({ used_at: new Date() }, { where: { employee_id: employee.id, used_at: null }, limit: 1 });

    const payload = await buildPayload(employee);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ employeeId: employee.id });
    await employee.update({ otp_hash: null, otp_expires: null, otp_attempts: 0, otp_locked_until: null, refresh_token: await bcrypt.hash(refreshToken, 8), refresh_expires: new Date(Date.now() + REFRESH_EXPIRY_MS), last_login_at: new Date() });
    await logActivity({ companyId: employee.company_id, employeeId: employee.id, action: 'LOGIN_SUCCESS', module: 'auth', entityId: employee.id, ipAddress });
     
    const user = await buildResponse(employee, payload);
    return { accessToken, refreshToken, user };
  }

  async refresh(incomingToken: string) {
    let decoded: { employeeId: number };
    try { decoded = verifyRefreshToken(incomingToken); } catch { throw new AppError('Session expired.', 401); }

    const employee = await Employee.findByPk(decoded.employeeId);
    if (!employee?.refresh_token) throw new AppError('Session not found.', 401);
    if (!employee.portal_access) throw new AppError('Portal access disabled.', 403);
    if (employee.refresh_expires && new Date() > employee.refresh_expires) {
      await employee.update({ refresh_token: null });
      throw new AppError('Session expired.', 401);
    }
    const isValid = await bcrypt.compare(incomingToken, employee.refresh_token);
    if (!isValid) { await employee.update({ refresh_token: null }); throw new AppError('Invalid session.', 401); }

    const payload = await buildPayload(employee);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ employeeId: employee.id });
    await employee.update({ refresh_token: await bcrypt.hash(refreshToken, 8), refresh_expires: new Date(Date.now() + REFRESH_EXPIRY_MS) });
    return { accessToken, refreshToken };
  }

  async logout(employeeId: number) {
    await Employee.update({ refresh_token: null, refresh_expires: null }, { where: { id: employeeId } });
  }

  async getMe(employeeId: number, activeCompanyId?: number) {
    const employee = await Employee.findByPk(employeeId, {
      attributes: { exclude: ['otp_hash','otp_expires','otp_attempts','otp_locked_until','refresh_token','refresh_expires'] },
    });
    if (!employee) throw new AppError('Not found.', 404);
    const payload = await buildPayload(employee, activeCompanyId);
    return buildResponse(employee, payload);
  }



  // private buildResponse(employee: Employee, payload: Awaited<ReturnType<typeof buildPayload>>) {
  //   return { id: employee.id, employeeId: employee.id, email: employee.email, fullName: `${employee.first_name} ${employee.last_name}`, firstName: employee.first_name, lastName: employee.last_name, avatarUrl: employee.avatar_url ?? null, companyId: employee.company_id, roleId: payload.roleId, roleSlug: payload.roleSlug, isSuperAdmin: employee.is_super_admin, permissions: payload.permissions };
  // }  
}
