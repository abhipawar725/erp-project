import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from './auth.middleware';
import {
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
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

router.post('/login', loginValidation, validate, login);
// router.post('/register', registerValidation, validate, register);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, resetPassword);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
// router.put('/change-password', authenticate, changePasswordValidation, validate, changePassword);

export default router;
