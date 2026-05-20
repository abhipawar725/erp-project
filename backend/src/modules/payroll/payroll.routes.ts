import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import {
  getPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  submitPayrollRun,
  approvePayrollRun,
  disbursePayrollRun,
  getPayslips,
  getPayslip,
} from './payroll.controller';

const router = Router();

router.use(authenticate);

// ─── Payroll Runs ─────────────────────────────────────────────────────────────
router.get('/runs', getPayrollRuns);

router.get('/runs/:id', [param('id').isInt({ min: 1 })], validate, getPayrollRun);

router.post(
  '/runs',
  requireRole('hr', 'admin'),
  [
    body('month').isInt({ min: 1, max: 12 }).withMessage('month must be 1–12'),
    body('year').isInt({ min: 2020 }).withMessage('year must be 2020 or later'),
  ],
  validate,
  createPayrollRun,
);

router.put(
  '/runs/:id/submit',
  requireRole('hr', 'admin'),
  [param('id').isInt({ min: 1 })],
  validate,
  submitPayrollRun,
);

router.put(
  '/runs/:id/approve',
  requireRole('hr', 'admin'),
  [param('id').isInt({ min: 1 })],
  validate,
  approvePayrollRun,
);

router.put(
  '/runs/:id/disburse',
  requireRole('hr', 'admin'),
  [param('id').isInt({ min: 1 })],
  validate,
  disbursePayrollRun,
);

// ─── Payslips ─────────────────────────────────────────────────────────────────
router.get(
  '/payslips/:employeeId',
  [param('employeeId').isInt({ min: 1 })],
  validate,
  getPayslips,
);

router.get(
  '/payslips/detail/:id',
  [param('id').isInt({ min: 1 })],
  validate,
  getPayslip,
);

export default router;
