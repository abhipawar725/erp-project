import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from './department.controller';

const router = Router();

router.use(authenticate);

// GET /api/departments
router.get('/', getDepartments);

// GET /api/departments/:id
router.get('/:id', [param('id').isInt({ min: 1 })], validate, getDepartment);

// POST /api/departments
router.post(
  '/',
  requireRole('hr', 'admin'),
  [
    body('name').trim().notEmpty().withMessage('Department name is required').isLength({ max: 200 }),
    body('code').optional().trim().isLength({ max: 20 }).withMessage('Code max 20 chars'),
    body('head_id').optional({ nullable: true }).isInt({ min: 1 }),
    body('parent_id').optional({ nullable: true }).isInt({ min: 1 }),
  ],
  validate,
  createDepartment,
);

// PUT /api/departments/:id
router.put(
  '/:id',
  requireRole('hr', 'admin'),
  [
    param('id').isInt({ min: 1 }),
    body('name').optional().trim().notEmpty().isLength({ max: 200 }),
    body('code').optional().trim().isLength({ max: 20 }),
    body('head_id').optional({ nullable: true }).isInt({ min: 1 }),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  updateDepartment,
);

// DELETE /api/departments/:id
router.delete(
  '/:id',
  requireRole('hr', 'admin'),
  [param('id').isInt({ min: 1 })],
  validate,
  deleteDepartment,
);

export default router;
