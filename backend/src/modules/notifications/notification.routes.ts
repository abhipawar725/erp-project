import { Router } from 'express';
import { param, query } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
} from './notification.controller';

const router = Router();

router.use(authenticate);

// GET /api/notifications?page=1&limit=20
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  getNotifications,
);

// GET /api/notifications/unread-count
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/mark-all-read  (must be before /:id to avoid route conflict)
router.put('/mark-all-read', markAllRead);

// PUT /api/notifications/:id/read
router.put(
  '/:id/read',
  [param('id').isInt({ min: 1 })],
  validate,
  markRead,
);

// DELETE /api/notifications/:id
router.delete(
  '/:id',
  [param('id').isInt({ min: 1 })],
  validate,
  deleteNotification,
);

export default router;
