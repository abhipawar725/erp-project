import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';
import { authenticate, authorize, requireRole } from '../../middleware/auth.middleware';
import {
  getTodaySummary,
  getByEmployee,
  getAllAttendance,
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
} from './attendance.controller';

const router = Router();

router.use(authenticate);

// GET /api/attendance/today-summary
router.get('/today-summary', getTodaySummary);

// GET /api/attendance/employee/:employeeId?month=5&year=2026
router.get(
  '/employee/:employeeId',
  [
    param('employeeId').isInt({ min: 1 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
    query('year').optional().isInt({ min: 2000 }),
  ],
  validate,
  getByEmployee,
);

// GET /api/attendance?date_from=2026-05-01&date_to=2026-05-31&status=Absent
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['Present', 'Absent', 'WFH', 'Half-Day', 'Holiday', 'Leave']),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601(),
  ],
  validate,
  getAllAttendance,
);

// POST /api/attendance — mark single
router.post(
  '/',
  requireRole('hr', 'admin', 'mgr'),
  [
    body('employee_id').isInt({ min: 1 }).withMessage('employee_id must be a positive integer'),
    body('date').isISO8601().withMessage('date must be a valid ISO date (YYYY-MM-DD)'),
    body('status')
      .isIn(['Present', 'Absent', 'WFH', 'Half-Day', 'Holiday', 'Leave'])
      .withMessage('Invalid status value'),
    body('check_in').optional({ nullable: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('check_in must be HH:MM'),
    body('check_out').optional({ nullable: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('check_out must be HH:MM'),
  ],
  validate,
  markAttendance,
);

// POST /api/attendance/bulk — mark multiple employees at once
router.post(
  '/bulk',
  requireRole('hr', 'admin'),
  [body('records').isArray({ min: 1 }).withMessage('records must be a non-empty array')],
  validate,
  bulkMarkAttendance,
);

// PUT /api/attendance/:id
router.put(
  '/:id',
  requireRole('hr', 'admin', 'mgr'),
  [param('id').isInt({ min: 1 })],
  validate,
  updateAttendance,
);

export default router;
