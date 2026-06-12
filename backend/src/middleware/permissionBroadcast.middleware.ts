import { Request, Response, NextFunction } from 'express';
import { emitPermissionUpdate, emitCompanyPermissionUpdate, PermissionUpdatePayload } from '../socket/socket';
import { Employee } from '../database/models/Employee';
import { logger } from '../config/logger';

type BroadcastEventType = PermissionUpdatePayload['eventType'];

// ─── Messages per event type ──────────────────────────────────────────────────

function buildMessage(
  eventType: BroadcastEventType,
  actorName: string,
  changes?: PermissionUpdatePayload['changes'],
): string {
  switch (eventType) {
    case 'role_assigned':
      return `Your role has been updated to ${changes?.roleName || 'a new role'} by ${actorName}. Your permissions have been refreshed.`;
    case 'role_removed':
      return `Your role assignment was removed by ${actorName}. Please contact HR if this is unexpected.`;
    case 'permissions_updated':
      return `Your permissions were updated by ${actorName}. The changes are now active.`;
    case 'bulk_permissions_updated':
      return `Your access permissions were updated by ${actorName}. Some menu items may have changed.`;
    case 'access_revoked':
      return `Your access to this company has been revoked by ${actorName}.`;
    default:
      return `Your permissions were updated by ${actorName}.`;
  }
}

// ─── Middleware factory ───────────────────────────────────────────────────────

export function broadcastAfter(eventType: BroadcastEventType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Intercept res.json to capture the response after controller finishes
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Call original first — sends the HTTP response
      const result = originalJson(body);

      // Only broadcast on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Fire async — never block the HTTP response
        setImmediate(async () => {
          try {
            await broadcastPermissionChange(req, eventType, body);
          } catch (err) {
            logger.error('Socket broadcast failed (non-critical):', err);
          }
        });
      }

      return result;
    };

    next();
  };
}

// ─── Core broadcast logic ─────────────────────────────────────────────────────

async function broadcastPermissionChange(
  req: Request,
  eventType: BroadcastEventType,
  responseBody: any,
): Promise<void> {
  const actor = req.user!;

  // Get actor's name for the toast message
  const actorEmployee = await Employee.findByPk(actor.employeeId, {
    attributes: ['first_name', 'last_name'],
  });
  const actorName = actorEmployee
    ? `${actorEmployee.first_name} ${actorEmployee.last_name}`
    : 'an admin';

  const data = responseBody?.data || responseBody;
  const companyId = actor.companyId;

  console.log("data", data)
  // Determine which employees were affected
  // Routes set different param names — check them all
  const targetEmployeeId =
    data?.employeeId ||
    req.body?.employee_id ||
    Number(req.params.employeeId) ||
    null;

  // Build changes summary
  const addedSlugs =
    Array.isArray(data?.added)
      ? data.added
      : Array.isArray(data?.slugs)
        ? data.slugs
        : [];

  const removedSlugs =
    Array.isArray(data?.removed)
      ? data.removed
      : [];

  const changes: PermissionUpdatePayload['changes'] = {
    roleName: data?.role?.name || data?.roleName,
    addedSlugs,
    removedSlugs,
    affectedModules:
      data?.modules || extractModulesFromSlugs(addedSlugs),
  };

  const message = buildMessage(eventType, actorName, changes);

  if (targetEmployeeId && targetEmployeeId !== actor.employeeId) {
    // Single employee targeted
    emitPermissionUpdate({
      employeeId: targetEmployeeId,
      companyId,
      eventType,
      message,
      triggeredBy: actorName,
      actorEmployeeId: actor.employeeId,
      changes,
    });
  } else if (eventType === 'bulk_permissions_updated' || eventType === 'permissions_updated') {

    emitCompanyPermissionUpdate(companyId, {
      eventType,
      message,
      triggeredBy: actorName,
      actorEmployeeId: actor.employeeId,
      changes,
    });
  }
}

function extractModulesFromSlugs(slugs: string[]): string[] {
  console.log("slug", slugs)
  return [...new Set(slugs.map(s => s.split(':')[0]))];
}
