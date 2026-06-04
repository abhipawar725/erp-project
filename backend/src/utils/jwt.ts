import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  employeeId:   number;
  companyId:    number;
  roleId:       number;
  roleSlug:     string;
  email:        string;
  isSuperAdmin: boolean;
  permissions:  string[];
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(payload: Pick<JwtPayload, 'employeeId'>): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'employeeId'> {
  return jwt.verify(token, env.jwt.refreshSecret) as Pick<JwtPayload, 'employeeId'>;
}
