import { body, param, query, ValidationChain } from 'express-validator';

export const listDesignationValidation: ValidationChain[] = [
  query('department_id').optional().isInt({ min: 1 }),
  query('is_active').optional().isIn(['true', 'false', 'all']),
  query('search').optional().isString().trim().isLength({ max: 100 }),
];

export const createDesignationValidation: ValidationChain[] = [
  body('name')
    .trim().notEmpty().withMessage('Designation name is required')
    .isLength({ max: 200 }).withMessage('Name must be 200 characters or less'),
  body('grade')
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage('Grade must be 20 characters or less'),
  body('department_id')
    .optional({ nullable: true }).isInt({ min: 1 })
    .withMessage('department_id must be a positive integer'),
];

export const updateDesignationValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('Invalid designation ID'),
  body('name')
    .optional().trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 200 }),
  body('grade')
    .optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('department_id')
    .optional({ nullable: true }).isInt({ min: 1 }),
  body('is_active')
    .optional().isBoolean().withMessage('is_active must be true or false'),
];

export const idValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('Invalid designation ID'),
];
