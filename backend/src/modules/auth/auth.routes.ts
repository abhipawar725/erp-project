import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from './auth.middleware';
import { body }   from 'express-validator';

import {
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  requestOtp,
  verifyOtp,
} from './auth.controller';
import {
  loginValidation,
  registerValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} from './auth.validation';

const router = Router();

router.post('/login', loginValidation, validate, login);
// router.post('/register', registerValidation, validate, register);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, resetPassword);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
// router.put('/change-password', authenticate, changePasswordValidation, validate, changePassword);

router.post('/request-otp',
  [
    body('email_or_phone').notEmpty().withMessage('Email or phone number required'),
    body('channel').optional().isIn(['email','sms']),
  ],
  validate, requestOtp,
);

router.post('/verify-otp',
  [
    body('email_or_phone').notEmpty(),
    body('otp').isLength({ min:6, max:6 }).withMessage('OTP must be 6 digits').isNumeric(),
  ],
  validate, verifyOtp,
);

export default router;
