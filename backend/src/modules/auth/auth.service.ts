import bcrypt  from 'bcryptjs';
import crypto  from 'crypto';
import { Op }  from 'sequelize';
import { User }             from '../../database/models/User';
import { Role, Permission, RolePermission } from '../../database/models/RoleModels';
import { PermissionGroup, GroupPermission, UserGroup } from '../../database/models/PermissionGroups';
import { Employee }         from '../../database/models/Employee';
import { hashPassword, comparePassword } from '../../utils/hash';
import {
  generateAccessToken, generateRefreshToken, verifyRefreshToken,
  type JwtPayload,
} from '../../utils/jwt';
import { AppError }         from '../../middleware/errorHandler.middleware';
import { logActivity }      from '../../utils/activityLogger';
import { OtpRequest, EmployeeRole } from '../../database/models/AuthModels';
import { RoleModulePermission } from '../../database/models/RoleModels';


// ─── Config ───────────────────────────────────────────────────────────────────
const OTP_EXPIRY_MS     = 10 * 60 * 1000;   // 10 min
const OTP_MAX_ATTEMPTS  = 3;
const OTP_LOCK_MS       = 15 * 60 * 1000;   // 15 min lock after 3 fails
const OTP_RATE_LIMIT    = 100;                 // max OTPs per hour
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;


// ─── Load user's permission slugs ────────────────────────────────────────────
// Unions: role_permissions + all permission groups the user belongs to.
// Super admin gets ['*'] — frontend uses isSuperAdmin flag.

async function loadPermissions(employeeId: number, companyId: number): Promise<string[]> {
  const empRoles = await EmployeeRole.findAll({
    where:   { employee_id: employeeId, company_id: companyId },
    include: [{
      model: Role, as: 'role',
      include: [{ model: RoleModulePermission, as: 'modulePermissions' }],
    }],
  });

  const slugs = new Set<string>();
  for (const er of empRoles) {
    const role = (er as any).role;
    for (const p of (role?.modulePermissions ?? [])) {
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


async function loadUserPermissions(
  userId:    number,
  roleId:    number,
  companyId: number,
): Promise<string[]> {
  const [rolePerms, userGroups] = await Promise.all([
    // Role permissions
    RolePermission.findAll({
      where: { role_id: roleId },
      include: [{ model: Permission, as: 'permission', attributes: ['slug'] }],
    }),
    // Permission group memberships
    UserGroup.findAll({
      where: { user_id: userId, company_id: companyId },
      include: [{
        model: PermissionGroup, as: 'group',
        where:   { is_active: true },
        include: [{
          model: Permission, as: 'permissions',
          through: { attributes: [] },
          attributes: ['slug'],
        }],
      }],
    }).catch(() => []),  // graceful: groups not seeded yet
  ]);

  const slugs = new Set<string>();
  for (const rp of rolePerms) {
    const s = (rp as any).permission?.slug;
    if (s) slugs.add(s);
  }
  for (const ug of userGroups) {
    for (const p of (ug as any).group?.permissions ?? []) {
      if (p.slug) slugs.add(p.slug);
    }
  }
  return [...slugs];
}

// ─── Build JWT payload ────────────────────────────────────────────────────────
async function buildTokenPayload(employee: Employee) {
  const permissions = employee.is_super_admin
    ? ['*']
    : await loadPermissions(employee.id, employee.company_id);

  // Get primary role for roleSlug + roleId
  const primaryRole = await EmployeeRole.findOne({
    where:   { employee_id: employee.id, company_id: employee.company_id },
    include: [{ model: Role, as: 'role' }],
  });
  const role = (primaryRole as any)?.role;

  return {
    // userId = employee.id — kept for backward compat across the whole codebase
    // Every req.user.userId reference continues to work without any changes
    userId:       employee.id,
    employeeId:   employee.id,   // explicit alias, same value
    companyId:    employee.company_id,
    roleId:       role?.id    ?? 0,
    roleSlug:     role?.slug  ?? 'employee',
    email:        employee.email,
    isSuperAdmin: employee.is_super_admin,
    permissions,
  };
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export class AuthService {

  // ── Step 1: Request OTP ────────────────────────────────────────────────────
  async requestOtp(emailOrPhone: string, channel: 'email' | 'sms' = 'email', ipAddress?: string) {
    const employee = await Employee.findOne({
      where: {
        [Op.or]: [
          { email: emailOrPhone.toLowerCase().trim() },
          { phone: emailOrPhone.trim() },
        ],
        portal_access: true,
      },
    });

    // Always return success — prevent email enumeration
    if (!employee) {
      return { message: 'If an account exists, an OTP has been sent.', expires_in: 600 };
    }

    // Check lock
    if (employee.otp_locked_until && new Date() < employee.otp_locked_until) {
      const mins = Math.ceil((employee.otp_locked_until.getTime() - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`, 429);
    }

    // Rate limit: max 5 OTPs per hour
    const recentCount = await OtpRequest.count({
      where: {
        employee_id:  employee.id,
        requested_at: { [Op.gte]: new Date(Date.now() - 3600000) },
      },
    });
    if (recentCount >= OTP_RATE_LIMIT) {
      throw new AppError('Too many OTP requests. Please wait 1 hour.', 429);
    }

    // Generate + hash OTP
    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash   = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await employee.update({ otp_hash: otpHash, otp_expires: expiresAt, otp_attempts: 0, otp_locked_until: null });
    await OtpRequest.create({ employee_id: employee.id, channel, ip_address: ipAddress ?? null, expires_at: expiresAt });

    // Dev: print OTP to console
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n🔑  OTP for ${emailOrPhone}:  ${otp}  (expires in 10 min)\n`);
    }
    // Prod: queue delivery → await otpQueue.add('send-otp', { employee_id, channel, destination, otp });

    return { message: 'If an account exists, an OTP has been sent.', expires_in: 600 };
  }

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  async verifyOtp(emailOrPhone: string, otp: string, ipAddress?: string) {
    const employee = await Employee.findOne({
      where: {
        [Op.or]: [
          { email: emailOrPhone.toLowerCase().trim() },
          { phone: emailOrPhone.trim() },
        ],
      },
    });


    if (!employee)               throw new AppError('Invalid credentials', 401);
    if (!employee.portal_access) throw new AppError('Portal access disabled. Contact HR.', 403);

    // Check lock
    if (employee.otp_locked_until && new Date() < employee.otp_locked_until) {
      const mins = Math.ceil((employee.otp_locked_until.getTime() - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`, 429);
    }

    // Check OTP exists
    if (!employee.otp_hash || !employee.otp_expires) {
      throw new AppError('No OTP found. Please request a new one.', 400);
    }

    // Check expiry
    if (new Date() > employee.otp_expires) {
      await employee.update({ otp_hash: null, otp_expires: null, otp_attempts: 0 });
      throw new AppError('OTP expired. Please request a new one.', 410);
    }

    // Verify
    const isValid = await bcrypt.compare(otp, employee.otp_hash);
    if (!isValid) {
      const attempts = employee.otp_attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await employee.update({
          otp_attempts:     attempts,
          otp_locked_until: new Date(Date.now() + OTP_LOCK_MS),
          otp_hash:         null,
          otp_expires:      null,
        });
        throw new AppError('Too many failed attempts. Account locked for 15 minutes.', 429);
      }
      await employee.update({ otp_attempts: attempts });
      const left = OTP_MAX_ATTEMPTS - attempts;
      throw new AppError(`Invalid OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.`, 401);
    }

    // Mark OTP used
    await OtpRequest.update({ used_at: new Date() }, { where: { employee_id: employee.id, used_at: null }, limit: 1 });

    // Build payload — userId = employee.id (backward compat preserved)
    const payload      = await buildTokenPayload(employee);
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: employee.id }); // ← userId kept

    // Clear OTP, store refresh token
    await employee.update({
      otp_hash:         null,
      otp_expires:      null,
      otp_attempts:     0,
      otp_locked_until: null,
      refresh_token:    await bcrypt.hash(refreshToken, 8),
      refresh_expires:  new Date(Date.now() + REFRESH_EXPIRY_MS),
      last_login_at:    new Date(),
    });

    await logActivity({
      companyId: employee.company_id,
      userId:    employee.id,    // ← userId still used in logActivity
      action:    'LOGIN_SUCCESS',
      module:    'auth',
      entityId:  employee.id,
      ipAddress,
    });

    return { accessToken, refreshToken, user: this.buildResponse(employee, payload) };
  }


  // ── Login ──────────────────────────────────────────────────────────────────
  async login(dto: { email: string; password: string }, ipAddress?: string) {
    const user = await User.findOne({
      where: { email: dto.email.toLowerCase().trim() },
      include: [
        { model: Role, as: 'role', attributes: ['id','name','slug'] },
        {
          model: Employee, as: 'employee',
          attributes: ['id','first_name','last_name','avatar_url'],
          required: false,
        },
      ],
    });

    if (!user)          throw new AppError('Invalid email or password', 401);
    if (!user.is_active) throw new AppError('Your account has been deactivated. Please contact HR.', 403);

    const isValid = await comparePassword(dto.password, user.password_hash);
    if (!isValid) throw new AppError('Invalid email or password', 401);

    const roleSlug: string = (user as any).role?.slug ?? 'emp';
    const employee         = (user as any).employee ?? null;

    const payload      = await buildTokenPayload(employee);
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    user.refresh_token = await hashPassword(refreshToken);
    user.last_login_at = new Date();
    await user.save();

    await logActivity({
      companyId: user.company_id,
      userId:    user.id,
      action:    'USER_LOGIN',
      module:    'auth',
      entityId:  user.id,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id:          user.id,
        email:       user.email,
        roleId:      user.role_id,
        roleSlug,
        companyId:   user.company_id,
        employeeId:  user.employee_id ?? null,
        fullName:    employee ? `${employee.first_name} ${employee.last_name}` : null,
        avatarUrl:   employee?.avatar_url ?? null,
        isSuperAdmin: user.is_super_admin ?? false,
        permissions: payload.permissions,
      },
    };
  }

  // ── Refresh ────────────────────────────────────────────────────────────────
  async refresh(incomingToken: string) {
    let decoded: { userId: number };
    try { decoded = verifyRefreshToken(incomingToken); }
    catch { throw new AppError('Session expired. Please log in again.', 401); }

    const employee = await Employee.findByPk(decoded.userId); // ← userId lookup
    if (!employee?.refresh_token) throw new AppError('Session not found. Please log in again.', 401);
    if (!employee.portal_access)  throw new AppError('Portal access disabled.', 403);
    if (employee.refresh_expires && new Date() > employee.refresh_expires) {
      await employee.update({ refresh_token: null });
      throw new AppError('Session expired. Please log in again.', 401);
    }

    const isValid = await bcrypt.compare(incomingToken, employee.refresh_token);
    if (!isValid) {
      await employee.update({ refresh_token: null });
      throw new AppError('Invalid session. Please log in again.', 401);
    }

    const payload      = await buildTokenPayload(employee);
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: employee.id }); // ← userId kept

    await employee.update({
      refresh_token:  await bcrypt.hash(refreshToken, 8),
      refresh_expires: new Date(Date.now() + REFRESH_EXPIRY_MS),
    });

    return { accessToken, refreshToken };
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout(userId: number) {
    await User.update({ refresh_token: null }, { where: { id: userId } });
  }

  // ── Get me ─────────────────────────────────────────────────────────────────
  async getMe(userId: number) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash','refresh_token','reset_token','reset_expires'] },
      include: [
        { model: Role,     as: 'role',     attributes: ['id','name','slug'] },
        { model: Employee, as: 'employee', attributes: ['id','first_name','last_name','avatar_url'], required: false },
      ],
    });
    if (!user) throw new AppError('User not found', 404);

    const roleSlug: string = (user as any).role?.slug ?? 'emp';
    const employee          = (user as any).employee ?? null;
    const permissions       = user.is_super_admin
      ? ['*']
      : await loadUserPermissions(user.id, user.role_id, user.company_id);

    return {
      id:          user.id,
      email:       user.email,
      roleId:      user.role_id,
      roleSlug,
      companyId:   user.company_id,
      employeeId:  user.employee_id ?? null,
      fullName:    employee ? `${employee.first_name} ${employee.last_name}` : null,
      avatarUrl:   employee?.avatar_url ?? null,
      isSuperAdmin: user.is_super_admin ?? false,
      permissions,
    };
  }

  // ── Forgot password ────────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) return;  // always succeed — prevent email enumeration

    const rawToken        = crypto.randomBytes(32).toString('hex');
    user.reset_token      = await hashPassword(rawToken);
    user.reset_expires    = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // In dev, return token directly. In prod, email it.
    return process.env.NODE_ENV === 'development' ? rawToken : undefined;
  }

  // ── Reset password ─────────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const candidates = await User.findAll({
      where: { reset_expires: { [Op.gt]: new Date() } },
    });
    let target: User | null = null;
    for (const u of candidates) {
      if (u.reset_token && (await comparePassword(token, u.reset_token))) {
        target = u; break;
      }
    }
    if (!target) throw new AppError('Invalid or expired reset link.', 400);

    target.password_hash = await hashPassword(newPassword);
    target.reset_token   = null;
    target.reset_expires = null;
    target.refresh_token = null;
    await target.save();
  }

  // ── Change password ────────────────────────────────────────────────────────
  async changePassword(userId: number, currentPwd: string, newPwd: string) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!(await comparePassword(currentPwd, user.password_hash))) {
      throw new AppError('Current password is incorrect', 400);
    }
    if (currentPwd === newPwd) throw new AppError('New password must be different', 400);
    user.password_hash = await hashPassword(newPwd);
    user.refresh_token = null;
    await user.save();
  }

  private buildResponse(employee: Employee, payload: ReturnType<typeof buildTokenPayload> extends Promise<infer T> ? T : never) {
    return {
      id:           employee.id,
      userId:       employee.id,       // ← preserved for frontend compatibility
      employeeId:   employee.id,       // ← explicit alias
      email:        employee.email,
      fullName:     `${employee.first_name} ${employee.last_name}`,
      firstName:    employee.first_name,
      lastName:     employee.last_name,
      avatarUrl:    employee.avatar_url,
      companyId:    employee.company_id,
      roleId:       payload.roleId,
      roleSlug:     payload.roleSlug,
      isSuperAdmin: employee.is_super_admin,
      permissions:  payload.permissions,
    };
  }  
}
