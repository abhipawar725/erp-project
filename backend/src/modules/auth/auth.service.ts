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

// ─── Load user's permission slugs ────────────────────────────────────────────
// Unions: role_permissions + all permission groups the user belongs to.
// Super admin gets ['*'] — frontend uses isSuperAdmin flag.

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

async function buildPayload(user: User, roleSlug: string): Promise<JwtPayload> {
  const permissions = user.is_super_admin
    ? ['*']
    : await loadUserPermissions(user.id, user.role_id, user.company_id);

  return {
    userId:       user.id,
    companyId:    user.company_id,
    roleId:       user.role_id,
    roleSlug,
    email:        user.email,
    isSuperAdmin: user.is_super_admin ?? false,
    permissions,
  };
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export class AuthService {

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

    const payload      = await buildPayload(user, roleSlug);
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
    catch { throw new AppError('Invalid or expired session. Please log in again.', 401); }

    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Role, as: 'role', attributes: ['slug'] }],
    });
    if (!user?.refresh_token) throw new AppError('Session not found. Please log in again.', 401);
    if (!user.is_active)      throw new AppError('Account deactivated.', 403);

    const valid = await comparePassword(incomingToken, user.refresh_token);
    if (!valid) {
      user.refresh_token = null;
      await user.save();
      throw new AppError('Token reuse detected. All sessions invalidated.', 401);
    }

    const roleSlug     = (user as any).role?.slug ?? 'emp';
    const payload      = await buildPayload(user, roleSlug);
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    user.refresh_token = await hashPassword(refreshToken);
    await user.save();

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
}
