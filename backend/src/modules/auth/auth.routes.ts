import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import {
  login,
  register,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
} from './auth.controller';
import {
  loginValidation,
  registerValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} from './auth.validation';

const router = Router();

// ─── Public routes (no JWT needed) ───────────────────────────────────────────

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate user and return access + refresh tokens
 * @access Public
 */
router.post('/login', loginValidation, validate, login);

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user account
 * @access Public
 */
router.post('/register', registerValidation, validate, register);

/**
 * @route  POST /api/auth/refresh
 * @desc   Issue a new access token using the httpOnly refresh token cookie
 * @access Public (uses cookie)
 */
router.post('/refresh', refreshToken);

/**
 * @route  POST /api/auth/forgot-password
 * @desc   Send password reset email
 * @access Public
 */
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);

/**
 * @route  POST /api/auth/reset-password
 * @desc   Reset password using token from email
 * @access Public
 */
router.post('/reset-password', resetPasswordValidation, validate, resetPassword);

// ─── Protected routes (JWT required) ─────────────────────────────────────────

/**
 * @route  POST /api/auth/logout
 * @desc   Invalidate refresh token and clear cookie
 * @access Protected
 */
router.post('/logout', authenticate, logout);

/**
 * @route  GET /api/auth/me
 * @desc   Get current authenticated user's profile
 * @access Protected
 */
router.get('/me', authenticate, getMe);

/**
 * @route  PUT /api/auth/change-password
 * @desc   Change password (requires current password)
 * @access Protected
 */
router.put('/change-password', authenticate, changePasswordValidation, validate, changePassword);

export default router;
