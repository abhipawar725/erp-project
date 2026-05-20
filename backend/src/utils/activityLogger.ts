/**
 * activityLogger.ts — Standalone audit log utility
 *
 * This file has NO imports from other modules (except the model and logger).
 * It is safe to import from ANY module without circular-dependency risk.
 *
 * Import path:
 *   import { logActivity } from '../../utils/activityLogger';
 *   import { logActivity } from '../utils/activityLogger';
 *   import { logActivity } from './utils/activityLogger';
 *   (adjust depth to your file's location)
 */

import { ActivityLog } from '../database/models/ActivityLog';
import { logger } from '../config/logger';

// ─── Params type ──────────────────────────────────────────────────────────────
export interface LogActivityParams {
  companyId: number;
  userId?: number | null;
  action: string;
  module?: string;
  entityId?: number;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// logActivity — write one audit record
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Writes a single entry to the activity_logs table.
 * Fire-and-forget: errors are swallowed so that a logging failure
 * NEVER causes the parent operation to fail.
 *
 * @example
 *   await logActivity({
 *     companyId: req.user.companyId,
 *     userId:    req.user.userId,
 *     action:    'EMPLOYEE_CREATED',
 *     module:    'employees',
 *     entityId:  employee.id,
 *     newValues: { name: employee.first_name },
 *     ipAddress: req.ip,
 *   });
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await ActivityLog.create({
      company_id: params.companyId,
      user_id:    params.userId    ?? null,
      action:     params.action,
      module:     params.module    ?? null,
      entity_id:  params.entityId  ?? null,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    });
  } catch (err) {
    // Log to file but never throw — logging must not break business logic
    logger.error('[ActivityLog] Failed to write audit record:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// logActivitySync — non-awaited convenience wrapper
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Same as logActivity but does NOT need to be awaited.
 * Use this when you want truly fire-and-forget behaviour in a synchronous context.
 *
 * @example
 *   logActivitySync({ companyId, action: 'USER_LOGIN', userId });
 */
export function logActivitySync(params: LogActivityParams): void {
  logActivity(params).catch((err) =>
    logger.error('[ActivityLog] Sync write failed:', err),
  );
}
