import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  // userId === employeeId — same value.
  // Kept as userId for backward compat: every existing req.user.userId works unchanged.
  userId:       number;        // employee.id (previously users.id)
  employeeId:   number;        // explicit alias — same value as userId
  companyId:    number;
  roleId:       number;
  roleSlug:     string;
  email:        string;
  isSuperAdmin: boolean;
  permissions:  string[];      // e.g. ['employees:view', 'payroll:approve']
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(payload: Pick<JwtPayload, 'userId'>): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'userId'> {
  return jwt.verify(token, env.jwt.refreshSecret) as Pick<JwtPayload, 'userId'>;
}
