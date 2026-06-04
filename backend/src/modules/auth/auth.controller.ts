import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendResponse, sendError } from '../../utils/response';
import { env } from '../../config/env';

const svc = new AuthService();

const COOKIE = { httpOnly:true, secure:env.isProduction, sameSite:'strict' as const, maxAge:7*24*60*60*1000, path:'/api/auth' };

export async function requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email_or_phone, channel } = req.body;
    const r = await svc.requestOtp(email_or_phone, channel, req.ip);
    sendResponse(res, { message: r.message, data: { expires_in: r.expires_in } });
  } catch(e){ next(e); }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email_or_phone, otp } = req.body;
    const { accessToken, refreshToken, user } = await svc.verifyOtp(email_or_phone, otp, req.ip);
    res.cookie('refreshToken', refreshToken, COOKIE);
    sendResponse(res, { message: 'Login successful', data: { accessToken, user } });
  } catch(e){ next(e); }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) { sendError(res, 'Session expired.', 401); return; }
    const { accessToken, refreshToken } = await svc.refresh(token);
    res.cookie('refreshToken', refreshToken, COOKIE);
    sendResponse(res, { data: { accessToken } });
  } catch(e){ next(e); }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) await svc.logout(req.user.employeeId);  // employeeId
    res.clearCookie('refreshToken', { path: '/api/auth' });
    sendResponse(res, { message: 'Logged out.', data: null });
  } catch(e){ next(e); }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendResponse(res, { data: await svc.getMe(req.user!.employeeId) }); // employeeId
  } catch(e){ next(e); }
}
