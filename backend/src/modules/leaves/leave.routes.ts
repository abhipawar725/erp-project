import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';
import { authenticate, authorize, requireRole } from '../../middleware/auth.middleware';
import {
  getLeaves,
  getPendingLeaves,
  getLeaveTypes,
  applyLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
} from './leave.controller';

const router = Router();

router.use(authenticate);

// GET /api/leaves/types
router.get('/types', getLeaveTypes);

// GET /api/leaves/pending — for managers
router.get('/pending', authorize('leaves:approve'), getPendingLeaves);

// GET /api/leaves
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['Pending', 'Approved', 'Rejected', 'Cancelled']),
    query('employee_id').optional().isInt({ min: 1 }),
  ],
  validate,
  getLeaves,
);

// POST /api/leaves — apply for leave
router.post(
  '/',
  [
    body('employee_id').isInt({ min: 1 }).withMessage('employee_id required'),
    body('leave_type_id').isInt({ min: 1 }).withMessage('leave_type_id required'),
    body('from_date').isISO8601().withMessage('from_date must be a valid date'),
    body('to_date').isISO8601().withMessage('to_date must be a valid date'),
    body('days').isFloat({ min: 0.5 }).withMessage('days must be at least 0.5'),
    body('half_day').optional().isBoolean(),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  applyLeave,
);

// PUT /api/leaves/:id/approve
router.put(
  '/:id/approve',
  authorize('leaves:approve'),
  [param('id').isInt({ min: 1 })],
  validate,
  approveLeave,
);

// PUT /api/leaves/:id/reject
router.put(
  '/:id/reject',
  authorize('leaves:approve'),
  [
    param('id').isInt({ min: 1 }),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  rejectLeave,
);

// PUT /api/leaves/:id/cancel
router.put(
  '/:id/cancel',
  [param('id').isInt({ min: 1 })],
  validate,
  cancelLeave,
);

export default router;
