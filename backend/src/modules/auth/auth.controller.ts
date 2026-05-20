import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendResponse, sendError } from '../../utils/response';
import { env } from '../../config/env';

const authService = new AuthService();

// Cookie config for the httpOnly refreshToken
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,                         // Not accessible via JS
  secure: env.isProduction,              // HTTPS only in production
  sameSite: 'strict' as const,           // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,      // 7 days
  path: '/api/auth',                     // Cookie only sent to /api/auth routes
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const { accessToken, refreshToken, user } = await authService.login(req.body, ipAddress);

    // Refresh token in httpOnly cookie (not accessible by frontend JS)
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    sendResponse(res, {
      message: 'Login successful',
      data: { accessToken, user },
      statusCode: 200,
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accessToken, refreshToken, user } = await authService.register(req.body);

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    sendResponse(res, {
      message: 'Account created successfully',
      data: { accessToken, user },
      statusCode: 201,
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      sendError(res, 'No refresh token provided', 401);
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(token);

    // Rotate the refresh token cookie
    res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

    sendResponse(res, {
      message: 'Token refreshed',
      data: { accessToken },
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      await authService.logout(req.user.userId);
    }

    // Clear the httpOnly cookie
    res.clearCookie('refreshToken', { path: '/api/auth' });

    sendResponse(res, { message: 'Logged out successfully', data: null });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = await authService.forgotPassword(req.body.email);

    // In dev, we return the token directly so you can test without SMTP
    const devData = env.nodeEnv === 'development' && rawToken ? { resetToken: rawToken } : null;

    sendResponse(res, {
      message: 'If that email address exists in our system, a password reset link has been sent.',
      data: devData,
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    sendResponse(res, {
      message: 'Password has been reset successfully. Please log in with your new password.',
      data: null,
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/change-password  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.changePassword(req.user!.userId, req.body);
    sendResponse(res, {
      message: 'Password changed successfully. Please log in again on other devices.',
      data: null,
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.userId);
    sendResponse(res, { message: 'Current user fetched', data: user });
  } catch (e) {
    next(e);
  }
}
