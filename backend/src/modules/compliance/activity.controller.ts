/**
 * activity.controller.ts — HTTP handlers for activity log endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ActivityService } from './activity.service';
import { sendPaginated, sendResponse } from '../../utils/response';

const activityService = new ActivityService();

// GET /api/logs
export async function getActivityLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { rows, meta } = await activityService.getLogs(
      req.query as any,
      req.user!.companyId,
    );
    sendPaginated(res, rows, meta, 'Activity logs fetched');
  } catch (e) {
    next(e);
  }
}

// GET /api/logs/modules  — list of distinct modules for filter dropdown
export async function getModuleList(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const modules = await activityService.getModuleList(req.user!.companyId);
    sendResponse(res, { data: modules, message: 'Modules fetched' });
  } catch (e) {
    next(e);
  }
}
