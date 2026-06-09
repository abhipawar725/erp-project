/**
 * activityLogger.ts — Standalone audit log utility
 * No circular-dependency risk — safe to import from any module.
 */
import { ActivityLog } from '../database/models/ActivityLog';
import { logger }      from '../config/logger';

export interface LogActivityParams {
  companyId: number;
  employeeId?: number | null;
  action: string;
  module?: string;
  entityId?: number;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await ActivityLog.create({
      company_id:  params.companyId,
      employee_id: params.employeeId ?? null,   // ← was user_id
      action:      params.action,
      module:      params.module      ?? null,
      entity_id:   params.entityId    ?? null,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      ip_address:  params.ipAddress   ?? null,
      user_agent:  params.userAgent   ?? null,
    });
  }catch (err: any) {
  console.error('========== LOG_ACTIVITY FAILED ==========');
  console.error('MESSAGE:', err?.message);
  console.error('PARENT:', err?.parent);
  console.error('ORIGINAL:', err?.original);
  console.error('SQL:', err?.sql);
  console.error(err);
}
}
