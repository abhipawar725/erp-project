import bcrypt  from 'bcryptjs';
import { Op }  from 'sequelize';
import { Employee, EmployeeRole, OtpRequest, Role, RoleModulePermission } from '../../database/models/index';
import { AppError }    from '../../middleware/errorHandler.middleware';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { logActivity } from '../../utils/activityLogger';
import { otpService }  from '../../utils/otpService';

const OTP_EXPIRY_MS     = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS  = 3;
const OTP_LOCK_MS       = 15 * 60 * 1000;
const OTP_RATE_LIMIT    = 5;
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

async function loadPermissions(employeeId: number, companyId: number): Promise<string[]> {
  const rows = await EmployeeRole.findAll({
    where:   { employee_id: employeeId, company_id: companyId },
    include: [{ model: Role, as: 'role', include: [{ model: RoleModulePermission, as: 'modulePermissions' }] }],
  });
  const slugs = new Set<string>();
  for (const er of rows) {
    for (const p of ((er as any).role?.modulePermissions ?? [])) {
      if (p.can_view)    slugs.add(`${p.module}:view`);
      if (p.can_create)  slugs.add(`${p.module}:create`);
      if (p.can_edit)    slugs.add(`${p.module}:edit`);
      if (p.can_delete)  slugs.add(`${p.module}:delete`);
      if (p.can_approve) slugs.add(`${p.module}:approve`);
      if (p.can_export)  slugs.add(`${p.module}:export`);
    }
  }
  return [...slugs];
}

async function buildPayload(employee: Employee) {
  const permissions = employee.is_super_admin
    ? ['*']
    : await loadPermissions(employee.id, employee.company_id);
  const empRole = await EmployeeRole.findOne({
    where: { employee_id: employee.id, company_id: employee.company_id },
    include: [{ model: Role, as: 'role' }],
  });
  const role = (empRole as any)?.role;
  return { employeeId: employee.id, companyId: employee.company_id, roleId: role?.id ?? 0, roleSlug: role?.slug ?? 'employee', email: employee.email, isSuperAdmin: employee.is_super_admin, permissions };
}

export class AuthService {

  async requestOtp(emailOrPhone: string, channel: 'email' | 'sms' = 'email', ipAddress?: string) {
    const isPhone = /^\+?[0-9]{10,15}$/.test(emailOrPhone.trim());
    const employee = await Employee.findOne({
      where: { [Op.or]: isPhone ? [{ phone: emailOrPhone.trim() }] : [{ email: emailOrPhone.toLowerCase().trim() }], portal_access: true },
    });
    if (!employee) return { message: 'If an account exists, an OTP has been sent.', expires_in: 600 };

    if (employee.otp_locked_until && new Date() < employee.otp_locked_until) {
      const mins = Math.ceil((employee.otp_locked_until.getTime() - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`, 429);
    }

    const recentCount = await OtpRequest.count({ where: { employee_id: employee.id, requested_at: { [Op.gte]: new Date(Date.now() - 3600000) } } });
    if (recentCount >= OTP_RATE_LIMIT) throw new AppError('Too many OTP requests. Wait 1 hour.', 429);

    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash   = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await employee.update({ otp_hash: otpHash, otp_expires: expiresAt, otp_attempts: 0, otp_locked_until: null });
    await OtpRequest.create({ employee_id: employee.id, channel: isPhone ? 'sms' : 'email', ip_address: ipAddress ?? null, expires_at: expiresAt });

    await otpService.send({ channel: isPhone ? 'sms' : 'email', destination: isPhone ? emailOrPhone.trim() : employee.email, otp, employeeId: employee.id });

    return { message: 'If an account exists, an OTP has been sent.', expires_in: 600 };
  }

  async verifyOtp(emailOrPhone: string, otp: string, ipAddress?: string) {
    const isPhone = /^\+?[0-9]{10,15}$/.test(emailOrPhone.trim());
    const employee = await Employee.findOne({
      where: { [Op.or]: isPhone ? [{ phone: emailOrPhone.trim() }] : [{ email: emailOrPhone.toLowerCase().trim() }] },
    });
    if (!employee)               throw new AppError('Invalid credentials.', 401);
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

    const payload      = await buildPayload(employee);
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ employeeId: employee.id });

    await employee.update({ otp_hash: null, otp_expires: null, otp_attempts: 0, otp_locked_until: null, refresh_token: await bcrypt.hash(refreshToken, 8), refresh_expires: new Date(Date.now() + REFRESH_EXPIRY_MS), last_login_at: new Date() });
    await logActivity({ companyId: employee.company_id, employeeId: employee.id, action: 'LOGIN_SUCCESS', module: 'auth', entityId: employee.id, ipAddress });

    return { accessToken, refreshToken, user: this.buildResponse(employee, payload) };
  }

  async refresh(incomingToken: string) {
    let decoded: { employeeId: number };
    try { decoded = verifyRefreshToken(incomingToken); } catch { throw new AppError('Session expired.', 401); }

    const employee = await Employee.findByPk(decoded.employeeId);
    if (!employee?.refresh_token) throw new AppError('Session not found.', 401);
    if (!employee.portal_access)  throw new AppError('Portal access disabled.', 403);
    if (employee.refresh_expires && new Date() > employee.refresh_expires) {
      await employee.update({ refresh_token: null });
      throw new AppError('Session expired.', 401);
    }
    const isValid = await bcrypt.compare(incomingToken, employee.refresh_token);
    if (!isValid) { await employee.update({ refresh_token: null }); throw new AppError('Invalid session.', 401); }

    const payload      = await buildPayload(employee);
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ employeeId: employee.id });
    await employee.update({ refresh_token: await bcrypt.hash(refreshToken, 8), refresh_expires: new Date(Date.now() + REFRESH_EXPIRY_MS) });
    return { accessToken, refreshToken };
  }

  async logout(employeeId: number) {
    await Employee.update({ refresh_token: null, refresh_expires: null }, { where: { id: employeeId } });
  }

  async getMe(employeeId: number) {
    const employee = await Employee.findByPk(employeeId, { attributes: { exclude: ['otp_hash','otp_expires','otp_attempts','otp_locked_until','refresh_token','refresh_expires'] } });
    if (!employee) throw new AppError('Not found.', 404);
    const payload = await buildPayload(employee);
    return this.buildResponse(employee, payload);
  }

  private buildResponse(employee: Employee, payload: Awaited<ReturnType<typeof buildPayload>>) {
    return { id: employee.id, employeeId: employee.id, email: employee.email, fullName: `${employee.first_name} ${employee.last_name}`, firstName: employee.first_name, lastName: employee.last_name, avatarUrl: employee.avatar_url ?? null, companyId: employee.company_id, roleId: payload.roleId, roleSlug: payload.roleSlug, isSuperAdmin: employee.is_super_admin, permissions: payload.permissions };
  }
}
