import { Router } from 'express';
import { body }   from 'express-validator';
import { validate }     from '../../middleware/validate.middleware';
import { authenticate } from '../auth/auth.middleware';
import * as authController from './auth.controller';

const router = Router();

// Request OTP — email or phone
router.post('/request-otp',
  [
    body('email_or_phone').notEmpty().withMessage('Email or phone number required'),
    body('channel').optional().isIn(['email','sms']),
  ],
  validate,
  authController.requestOtp,
);

// Verify OTP — returns JWT
router.post('/verify-otp',
  [
    body('email_or_phone').notEmpty(),
    body('otp').isLength({ min:6, max:6 }).withMessage('OTP must be 6 digits').isNumeric(),
  ],
  validate,
  authController.verifyOtp,
);

// Refresh access token (uses httpOnly cookie)
router.post('/refresh', authController.refreshToken);

// Logout
router.post('/logout', authenticate, authController.logout);

// Get current employee profile
router.get('/me', authenticate, authController.getMe);

export default router;
