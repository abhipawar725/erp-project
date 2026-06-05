import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticate, authorize } from '../../modules/auth/auth.middleware';
import { uploadAvatar as uploadAvatarMiddleware } from '../../middleware/upload.middleware';
import {
  getEmployees,
  // getNextCode,
  // getSummary,
  getEmployee,
  createEmployee,
  updateEmployee,
  // patchEmployeeStep,
  deleteEmployee,
  // uploadAvatar,
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
router.get('/', listEmployeeValidation, validate, authorize('employees:view'), getEmployees);

/** GET /api/employees/summary — dashboard stats */
// router.get('/summary', getSummary);

/** GET /api/employees/next-code — auto-generate next employee code */
// router.get('/next-code', getNextCode);

/** POST /api/employees — create new employee (full profile) */
router.post(
  '/',
  createEmployeeValidation,
  validate,
  authorize('employees:edit'),
  createEmployee,
);

// ─── Item routes ──────────────────────────────────────────────────────────────

/** GET /api/employees/:id — full profile */
router.get('/:id', employeeIdValidation, validate, authorize('employees:view'), getEmployee);

/** PUT /api/employees/:id — full update */
router.put(
  '/:id',

  employeeIdValidation,
  validate,
  authorize('employees:edit'),
  updateEmployee,
);

/** PATCH /api/employees/:id/step/:step */
// router.patch(
//   '/:id/step/:step',

//   employeeIdValidation,
//   validate,
//   patchEmployeeStep,
// );

/** DELETE /api/employees/:id — soft delete */
router.delete(
  '/:id',
  employeeIdValidation,
  validate,
  authorize('employees:delete'),
  deleteEmployee,
);

/** POST /api/employees/:id/avatar — upload profile photo */
// router.post(
//   '/:id/avatar',

//   employeeIdValidation,
//   validate,
//   uploadAvatarMiddleware.single('avatar'),
//   uploadAvatar,
// );

export default router;
