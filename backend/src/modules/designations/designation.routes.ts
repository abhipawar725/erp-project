import { Router } from 'express';
import { validate }                  from '../../middleware/validate.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import {
  getDesignations, getDesignationStats, getDesignation,
  createDesignation, updateDesignation, toggleDesignation, deleteDesignation,
} from './designation.controller';
import {
  createDesignationValidation, updateDesignationValidation,
  listDesignationValidation, idValidation,
} from './designation.validation';

const router = Router();
router.use(authenticate);

// GET /api/designations?department_id=1&is_active=true|false|all&search=eng
router.get('/', listDesignationValidation, validate, getDesignations);

// GET /api/designations/stats  — MUST come before /:id
router.get('/stats', getDesignationStats);

// GET /api/designations/:id
router.get('/:id', idValidation, validate, getDesignation);

// POST /api/designations
router.post('/', requireRole('hr', 'admin'), createDesignationValidation, validate, createDesignation);

// PUT /api/designations/:id
router.put('/:id', requireRole('hr', 'admin'), updateDesignationValidation, validate, updateDesignation);

// PATCH /api/designations/:id/toggle — activate / deactivate
router.patch('/:id/toggle', requireRole('hr', 'admin'), idValidation, validate, toggleDesignation);

// DELETE /api/designations/:id
router.delete('/:id', requireRole('hr', 'admin'), idValidation, validate, deleteDesignation);

export default router;
