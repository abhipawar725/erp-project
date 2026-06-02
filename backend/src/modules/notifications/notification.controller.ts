import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { sendResponse } from '../../utils/response';

const notificationService = new NotificationService();

// GET /api/notifications
export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, meta, unreadCount } = await notificationService.getForUser(
      req.user!.userId,
      req.user!.companyId,
      req.query as any,
    );
    res.json({ success: true, message: 'Notifications fetched', data: rows, meta, unreadCount });
  } catch (e) { next(e); }
}

// GET /api/notifications/unread-count
export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await notificationService.getUnreadCount(req.user!.userId, req.user!.companyId);
    sendResponse(res, { data: { count }, message: 'Unread count' });
  } catch (e) { next(e); }
}

// PUT /api/notifications/:id/read
export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notification = await notificationService.markRead(parseInt(req.params.id, 10), req.user!.userId);
    sendResponse(res, { data: notification, message: 'Notification marked as read' });
  } catch (e) { next(e); }
}

// PUT /api/notifications/mark-all-read
export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await notificationService.markAllRead(req.user!.userId, req.user!.companyId);
    sendResponse(res, { data: result, message: `${result.updated} notification(s) marked as read` });
  } catch (e) { next(e); }
}

// DELETE /api/notifications/:id
export async function deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await notificationService.delete(parseInt(req.params.id, 10), req.user!.userId);
    sendResponse(res, { data: null, message: 'Notification deleted' });
  } catch (e) { next(e); }
}
