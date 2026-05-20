import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticate, authorize, requireRole } from '../../middleware/auth.middleware';
import { uploadAvatar as uploadAvatarMiddleware } from '../../middleware/upload.middleware';
import {
  getEmployees,
  getNextCode,
  getSummary,
  getEmployee,
  createEmployee,
  updateEmployee,
  patchEmployeeStep,
  deleteEmployee,
  uploadAvatar,
} from './employee.controller';
import {
  createEmployeeValidation,
  listEmployeeValidation,
  employeeIdValidation,
  basicInfoValidation,
  employmentValidation,
  addressValidation,
  statutoryValidation,
  bankValidation,
} from './employee.validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Collection routes ────────────────────────────────────────────────────────

/** GET /api/employees — paginated list with filters */
router.get('/', listEmployeeValidation, validate, getEmployees);

/** GET /api/employees/summary — dashboard stats */
router.get('/summary', getSummary);

/** GET /api/employees/next-code — auto-generate next employee code */
router.get('/next-code', requireRole('hr', 'admin'), getNextCode);

/** POST /api/employees — create new employee (full profile) */
router.post(
  '/',
  requireRole('hr', 'admin'),
  createEmployeeValidation,
  validate,
  createEmployee,
);

// ─── Item routes ──────────────────────────────────────────────────────────────

/** GET /api/employees/:id — full profile */
router.get('/:id', employeeIdValidation, validate, getEmployee);

/** PUT /api/employees/:id — full update */
router.put(
  '/:id',
  requireRole('hr', 'admin'),
  employeeIdValidation,
  validate,
  updateEmployee,
);

/** PATCH /api/employees/:id/step/:step */
router.patch(
  '/:id/step/:step',
  requireRole('hr', 'admin'),
  employeeIdValidation,
  validate,
  patchEmployeeStep,
);

/** DELETE /api/employees/:id — soft delete */
router.delete(
  '/:id',
  requireRole('hr', 'admin'),
  employeeIdValidation,
  validate,
  deleteEmployee,
);

/** POST /api/employees/:id/avatar — upload profile photo */
router.post(
  '/:id/avatar',
  requireRole('hr', 'admin'),
  employeeIdValidation,
  validate,
  uploadAvatarMiddleware.single('avatar'),
  uploadAvatar,
);

export default router;
