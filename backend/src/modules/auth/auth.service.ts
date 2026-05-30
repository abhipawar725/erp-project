import crypto from 'crypto';
import { Op } from 'sequelize';
import { User } from '../../database/models/User';
import { Role } from '../../database/models/RoleModels';
import { Employee } from '../../database/models/Employee';
import { hashPassword, comparePassword } from '../../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler.middleware';
import { mailer } from '../../utils/mailer';
import { logActivity } from '../../utils/activityLogger';
import type {
  LoginDto,
  RegisterDto,
  AuthLoginResponse,
  AuthTokens,
  AuthUserPayload,
  ChangePasswordDto,
} from './auth.types';

export class AuthService {
  // ─────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────

  private async buildTokens(user: User, roleSlug: string): Promise<AuthTokens> {
    const accessToken = generateAccessToken({
      userId:       user.id,
      companyId:    user.company_id,
      roleId:       user.role_id,
      roleSlug,
      email:        user.email,
      isSuperAdmin: user.is_super_admin ?? false,
    });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store hashed refresh token — so even DB breach doesn't expose raw tokens
    user.refresh_token = await hashPassword(refreshToken);
    await user.save();

    return { accessToken, refreshToken };
  }

  private buildUserPayload(user: User, roleSlug: string, employee?: Employee | null): AuthUserPayload {
    return {
      id:           user.id,
      email:        user.email,
      roleId:       user.role_id,
      roleSlug,
      companyId:    user.company_id,
      employeeId:   user.employee_id ?? null,
      fullName:     employee ? `${employee.first_name} ${employee.last_name}` : null,
      avatarUrl:    employee?.avatar_url ?? null,
      isSuperAdmin: user.is_super_admin ?? false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────────────────────
  async login(dto: LoginDto, ipAddress?: string): Promise<AuthLoginResponse> {
    const user = await User.findOne({
      where: { email: dto.email.toLowerCase().trim() },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'slug'] },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'avatar_url'],
          required: false,
        },
      ],
    });

    // Use a generic error message to prevent email enumeration
    if (!user) throw new AppError('Invalid email or password', 401);
    if (!user.is_active) throw new AppError('Your account has been deactivated. Please contact HR.', 403);

    const isValid = await comparePassword(dto.password, user.password_hash);
    if (!isValid) throw new AppError('Invalid email or password', 401);

    const roleSlug: string = (user as any).role?.slug ?? 'emp';
    const employee: Employee | null = (user as any).employee ?? null;

    const { accessToken, refreshToken } = await this.buildTokens(user, roleSlug);

    user.last_login_at = new Date();
    await user.save();

    // Audit log
    await logActivity({
      companyId: user.company_id,
      userId: user.id,
      action: 'USER_LOGIN',
      module: 'auth',
      entityId: user.id,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: this.buildUserPayload(user, roleSlug, employee),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Register
  // ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthLoginResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) throw new AppError('An account with this email already exists.', 409);

    const companyId = dto.company_id ?? 1;
    const roleSlugTarget = dto.role_slug ?? 'emp';

    const role = await Role.findOne({
      where: { company_id: companyId, slug: roleSlugTarget },
    });
    if (!role) {
      throw new AppError(`Role "${roleSlugTarget}" not found. Please contact your administrator.`, 400);
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await User.create({
      company_id: companyId,
      email: normalizedEmail,
      password_hash: passwordHash,
      role_id: role.id,
      is_active: true,
    });

    const { accessToken, refreshToken } = await this.buildTokens(user, role.slug);

    await logActivity({
      companyId: user.company_id,
      userId: user.id,
      action: 'USER_REGISTERED',
      module: 'auth',
      entityId: user.id,
    });

    return {
      accessToken,
      refreshToken,
      user: this.buildUserPayload(user, role.slug, null),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Refresh Token
  // ─────────────────────────────────────────────────────────────
  async refresh(incomingRefreshToken: string): Promise<AuthTokens> {
    let payload: { userId: number };

    try {
      payload = verifyRefreshToken(incomingRefreshToken);
    } catch {
      throw new AppError('Invalid or expired session. Please log in again.', 401);
    }

    const user = await User.findByPk(payload.userId, {
      include: [{ model: Role, as: 'role', attributes: ['slug'] }],
    });

    if (!user || !user.refresh_token) {
      throw new AppError('Session not found. Please log in again.', 401);
    }
    if (!user.is_active) {
      throw new AppError('Account deactivated.', 403);
    }

    const isValid = await comparePassword(incomingRefreshToken, user.refresh_token);
    if (!isValid) {
      // Possible token reuse attack — invalidate all sessions
      user.refresh_token = null;
      await user.save();
      throw new AppError('Token reuse detected. All sessions invalidated. Please log in again.', 401);
    }

    const roleSlug: string = (user as any).role?.slug ?? 'emp';
    const { accessToken, refreshToken: newRefreshToken } = await this.buildTokens(user, roleSlug);

    return { accessToken, refreshToken: newRefreshToken };
  }

  // ─────────────────────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────────────────────
  async logout(userId: number): Promise<void> {
    await User.update({ refresh_token: null }, { where: { id: userId } });

    await logActivity({
      companyId: 0, // Will be set from req.user in controller
      userId,
      action: 'USER_LOGOUT',
      module: 'auth',
      entityId: userId,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Forgot Password
  // ─────────────────────────────────────────────────────────────
  async forgotPassword(email: string): Promise<string | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ where: { email: normalizedEmail } });

    // Always return success — prevents email enumeration attacks
    if (!user) return null;

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.reset_token = await hashPassword(rawToken);
    user.reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email (fire-and-forget, failures are logged not thrown)
    try {
      await mailer.sendPasswordReset(normalizedEmail, rawToken);
    } catch (emailError) {
      console.error('Password reset email failed:', emailError);
    }

    await logActivity({
      companyId: user.company_id,
      userId: user.id,
      action: 'FORGOT_PASSWORD_REQUESTED',
      module: 'auth',
      entityId: user.id,
    });

    // Return raw token ONLY in development for testing
    return process.env.NODE_ENV === 'development' ? rawToken : null;
  }

  // ─────────────────────────────────────────────────────────────
  // Reset Password
  // ─────────────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Load all users with non-expired reset tokens
    const candidates = await User.findAll({
      where: {
        reset_token: { [Op.ne]: null },
        reset_expires: { [Op.gt]: new Date() },
      },
    });

    let targetUser: User | null = null;
    for (const candidate of candidates) {
      if (candidate.reset_token && (await comparePassword(token, candidate.reset_token))) {
        targetUser = candidate;
        break;
      }
    }

    if (!targetUser) {
      throw new AppError('Password reset link is invalid or has expired. Please request a new one.', 400);
    }

    targetUser.password_hash = await hashPassword(newPassword);
    targetUser.reset_token = null;
    targetUser.reset_expires = null;
    targetUser.refresh_token = null; // Force re-login on ALL devices
    await targetUser.save();

    await logActivity({
      companyId: targetUser.company_id,
      userId: targetUser.id,
      action: 'PASSWORD_RESET',
      module: 'auth',
      entityId: targetUser.id,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Change Password (authenticated user)
  // ─────────────────────────────────────────────────────────────
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);

    const isCurrentValid = await comparePassword(dto.current_password, user.password_hash);
    if (!isCurrentValid) throw new AppError('Current password is incorrect', 400);

    if (dto.current_password === dto.new_password) {
      throw new AppError('New password must be different from current password', 400);
    }

    user.password_hash = await hashPassword(dto.new_password);
    user.refresh_token = null; // Force re-login on all other devices
    await user.save();

    await logActivity({
      companyId: user.company_id,
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      module: 'auth',
      entityId: user.id,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Get Me
  // ─────────────────────────────────────────────────────────────
  async getMe(userId: number): Promise<AuthUserPayload> {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash', 'refresh_token', 'reset_token', 'reset_expires'] },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'slug'] },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'avatar_url', 'department_id', 'designation_id'],
          required: false,
        },
      ],
    });

    if (!user) throw new AppError('User not found', 404);

    const roleSlug: string = (user as any).role?.slug ?? 'emp';
    const employee: Employee | null = (user as any).employee ?? null;

    return {
      ...this.buildUserPayload(user, roleSlug, employee),
      // Include extra fields for the /me endpoint
      ...(user as any).toJSON(),
    };
  }
}
