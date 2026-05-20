/**
 * activity.service.ts — Activity log query service
 *
 * Business logic for reading / querying the activity_logs table.
 * Write operations go through utils/activityLogger.ts.
 */

import { WhereOptions } from 'sequelize';
import { ActivityLog } from '../../database/models/ActivityLog';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';

export interface ActivityLogQuery {
  page?:     number | string;
  limit?:    number | string;
  module?:   string;
  user_id?:  number | string;
  action?:   string;
  from?:     string; // ISO date string
  to?:       string; // ISO date string
}

export class ActivityService {
  async getLogs(query: ActivityLogQuery, companyId: number) {
    const { page, limit, offset } = parsePaginationParams(query as Record<string, unknown>);

    const where: WhereOptions = { company_id: companyId };

    if (query.module)  where['module']  = query.module;
    if (query.user_id) where['user_id'] = Number(query.user_id);
    if (query.action)  where['action']  = query.action;

    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return { rows, meta: buildPaginationMeta(page, limit, count) };
  }

  async getModuleList(companyId: number): Promise<string[]> {
    const results = await ActivityLog.findAll({
      where: { company_id: companyId },
      attributes: ['module'],
      group: ['module'],
      raw: true,
    });
    return results
      .map((r: any) => r.module as string)
      .filter(Boolean);
  }
}
