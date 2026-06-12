import { Router } from 'express';
import { validate }                  from '../../middleware/validate.middleware';
import { authenticate, authorize} from '../../modules/auth/auth.middleware';
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
router.post('/', createDepartmentValidation, validate, createDepartment);

// PUT /api/departments/:id
router.put('/:id', updateDepartmentValidation, validate, updateDepartment);

// DELETE /api/departments/:id
router.delete('/:id', idValidation, validate, deleteDepartment);

export default router;
