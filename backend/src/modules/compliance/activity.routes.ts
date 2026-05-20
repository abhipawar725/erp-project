/**
 * activity.routes.ts — Routes for the compliance / audit log module
 */

import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { getActivityLogs, getModuleList } from './activity.controller';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireRole('hr', 'admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('user_id').optional().isInt({ min: 1 }),
  ],
  validate,
  getActivityLogs,
);

router.get('/modules', requireRole('hr', 'admin'), getModuleList);

export default router;
