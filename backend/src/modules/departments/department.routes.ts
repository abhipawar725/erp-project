import { Router } from 'express';
import { validate }                  from '../../middleware/validate.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import {
  getDepartments, getDepartmentStats, getDepartment,
  createDepartment, updateDepartment, deleteDepartment,
} from './department.controller';
import {
  listDepartmentValidation, createDepartmentValidation,
  updateDepartmentValidation, idValidation,
} from './department.validation';

const router = Router();
router.use(authenticate);

// GET /api/departments?search=eng&is_active=true
router.get('/', listDepartmentValidation, validate, getDepartments);

// GET /api/departments/stats
router.get('/stats', getDepartmentStats);

// GET /api/departments/:id
router.get('/:id', idValidation, validate, getDepartment);

// POST /api/departments
router.post('/', requireRole('hr', 'admin'), createDepartmentValidation, validate, createDepartment);

// PUT /api/departments/:id
router.put('/:id', requireRole('hr', 'admin'), updateDepartmentValidation, validate, updateDepartment);

// DELETE /api/departments/:id
router.delete('/:id', requireRole('hr', 'admin'), idValidation, validate, deleteDepartment);

export default router;
