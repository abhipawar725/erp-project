import { body, ValidationChain } from 'express-validator';

export const loginValidation: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const registerValidation: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('company_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('company_id must be a positive integer'),
  body('role_slug')
    .optional()
    .isIn(['hr', 'admin', 'mgr', 'emp'])
    .withMessage('role_slug must be one of: hr, admin, mgr, emp'),
];

export const forgotPasswordValidation: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
];

export const resetPasswordValidation: ValidationChain[] = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
];

export const changePasswordValidation: ValidationChain[] = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one number'),
];
