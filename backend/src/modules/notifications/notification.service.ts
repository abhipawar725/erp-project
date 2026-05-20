import { Notification } from '../../database/models/Notification';
import { AppError } from '../../middleware/errorHandler.middleware';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';

export interface CreateNotificationDto {
  company_id: number;
  user_id?: number | null;
  type?: string;
  title: string;
  body: string;
  link?: string;
}

export class NotificationService {
  // ─── Get notifications for current user (paginated) ────────────────────────
  async getForUser(userId: number, companyId: number, query: Record<string, unknown>) {
    const { page, limit, offset } = parsePaginationParams(query);

    const { count, rows } = await Notification.findAndCountAll({
      where: { user_id: userId, company_id: companyId },
      order:  [['created_at', 'DESC']],
      limit,
      offset,
    });

    const unreadCount = await Notification.count({
      where: { user_id: userId, company_id: companyId, is_read: false },
    });

    return { rows, meta: buildPaginationMeta(page, limit, count), unreadCount };
  }

  // ─── Mark one as read ──────────────────────────────────────────────────────
  async markRead(id: number, userId: number) {
    const notification = await Notification.findOne({ where: { id, user_id: userId } });
    if (!notification) throw new AppError('Notification not found', 404);

    await notification.update({ is_read: true, read_at: new Date() });
    return notification;
  }

  // ─── Mark all as read ──────────────────────────────────────────────────────
  async markAllRead(userId: number, companyId: number) {
    const [affected] = await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: userId, company_id: companyId, is_read: false } },
    );
    return { updated: affected };
  }

  // ─── Delete one ────────────────────────────────────────────────────────────
  async delete(id: number, userId: number) {
    const notification = await Notification.findOne({ where: { id, user_id: userId } });
    if (!notification) throw new AppError('Notification not found', 404);
    await notification.destroy();
  }

  // ─── Create (internal — called by other services) ─────────────────────────
  async create(dto: CreateNotificationDto) {
    return Notification.create({
      company_id: dto.company_id,
      user_id:    dto.user_id    ?? null,
      type:       dto.type       ?? null,
      title:      dto.title,
      body:       dto.body,
      link:       dto.link       ?? null,
      is_read:    false,
    });
  }

  // ─── Broadcast to multiple users ──────────────────────────────────────────
  async broadcast(userIds: number[], dto: Omit<CreateNotificationDto, 'user_id'>) {
    const records = userIds.map((uid) => ({
      company_id: dto.company_id,
      user_id:    uid,
      type:       dto.type    ?? null,
      title:      dto.title,
      body:       dto.body,
      link:       dto.link    ?? null,
      is_read:    false,
    }));

    return Notification.bulkCreate(records as any[]);
  }

  // ─── Unread count only (for topbar badge) ─────────────────────────────────
  async getUnreadCount(userId: number, companyId: number): Promise<number> {
    return Notification.count({
      where: { user_id: userId, company_id: companyId, is_read: false },
    });
  }
}
