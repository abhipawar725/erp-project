/**
 * rbac.middleware.ts — Full Role-Based Access Control
 *
 * This is the production-grade RBAC layer that sits on top of auth.middleware.ts.
 * It loads permissions from the database (with Redis cache) and enforces:
 *
 *   1. Module-level permissions  (can user perform this action on this module?)
 *   2. Field-level permissions   (can user view/edit/mask specific fields?)
 *   3. Scope restrictions        (can user access records outside their team?)
 *
 * Architecture:
 *   authenticate → rbacCheck('employees', 'read') → handler
 *
 * Cache strategy:
 *   Permissions are loaded once per role and cached in memory with a TTL.
 *   On role permission changes, call clearPermissionCache(roleId).
 */

import { Request, Response, NextFunction } from 'express';
import { Role, Permission, FieldPermission } from '../database/models/RoleModels';
import { sendError } from '../utils/response';
import { logger } from '../config/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldPermissionMap {
  [fieldName: string]: {
    can_view:     boolean;
    can_edit:     boolean;
    can_print:    boolean;
    can_download: boolean;
    can_copy:     boolean;
    is_masked:    boolean;
  };
}

export interface RolePermissionCache {
  slugs: Set<string>;                            // e.g. 'employees:read', 'payroll:approve'
  fieldPermissions: Record<string, FieldPermissionMap>; // module → field → flags
  loadedAt: number;                              // epoch ms — for TTL check
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory permission cache (TTL = 5 minutes)
// In production: replace with Redis or a shared store for multi-instance deploys
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const permissionCache = new Map<number, RolePermissionCache>(); // keyed by roleId

/**
 * Load permissions for a role from DB and cache them.
 */
async function loadPermissionsForRole(roleId: number): Promise<RolePermissionCache> {
  const cached = permissionCache.get(roleId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached;
  }

  // Load module-level permission slugs
  const role = await Role.findByPk(roleId, {
    include: [{ model: Permission, as: 'permissions', attributes: ['slug'] }],
  });

  const slugs = new Set<string>(
    ((role as any)?.permissions ?? []).map((p: any) => p.slug as string),
  );

  // Load field-level permissions grouped by module
  const fieldPerms = await FieldPermission.findAll({ where: { role_id: roleId } });

  const fieldPermissions: Record<string, FieldPermissionMap> = {};
  for (const fp of fieldPerms) {
    if (!fieldPermissions[fp.module]) fieldPermissions[fp.module] = {};
    fieldPermissions[fp.module][fp.field_name] = {
      can_view:     fp.can_view,
      can_edit:     fp.can_edit,
      can_print:    fp.can_print,
      can_download: fp.can_download,
      can_copy:     fp.can_copy,
      is_masked:    fp.is_masked,
    };
  }

  const entry: RolePermissionCache = { slugs, fieldPermissions, loadedAt: Date.now() };
  permissionCache.set(roleId, entry);
  return entry;
}

/**
 * Invalidate the cached permissions for a role.
 * Call this when role permissions are updated in Settings.
 */
export function clearPermissionCache(roleId?: number): void {
  if (roleId !== undefined) {
    permissionCache.delete(roleId);
    logger.info(`[RBAC] Cache cleared for roleId=${roleId}`);
  } else {
    permissionCache.clear();
    logger.info('[RBAC] Full permission cache cleared');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// rbacCheck — module-level permission guard (middleware factory)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Checks if the authenticated user's role has the given permission slug.
 * HR and Admin always pass (superusers).
 *
 * Usage:
 *   router.get('/',    authenticate, rbacCheck('employees', 'read'),   handler);
 *   router.post('/',   authenticate, rbacCheck('employees', 'write'),  handler);
 *   router.delete('/', authenticate, rbacCheck('employees', 'delete'), handler);
 *   router.put('/approve', authenticate, rbacCheck('payroll', 'approve'), handler);
 *
 * Slug format: `${module}:${action}`
 */
export function rbacCheck(module: string, action: string) {
  const slug = `${module}:${action}`;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { roleSlug, roleId } = req.user;

    // Superusers bypass everything
    if (roleSlug === 'hr' || roleSlug === 'admin') {
      next();
      return;
    }

    try {
      const cache = await loadPermissionsForRole(roleId);
      if (cache.slugs.has(slug)) {
        next();
        return;
      }

      sendError(
        res,
        `Forbidden: Your role does not have permission for "${slug}"`,
        403,
      );
    } catch (err) {
      logger.error('[RBAC] Permission load error:', err);
      sendError(res, 'Internal error while checking permissions', 500);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// attachFieldPermissions — injects field-level rules into req
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Loads field-level permissions for the given module and attaches them to
 * `req.fieldPermissions`. Use in response handlers to filter/mask sensitive fields.
 *
 * Usage in controller:
 *   router.get('/:id', authenticate, attachFieldPermissions('employees'), handler);
 *
 *   // In handler:
 *   const perms = req.fieldPermissions;
 *   if (perms?.['aadhaar_number']?.is_masked) {
 *     employee.aadhaar_number = maskValue(employee.aadhaar_number);
 *   }
 *   if (!perms?.['bank_account_number']?.can_view) {
 *     delete employee.bank_account_number;
 *   }
 */

// Extend Request
declare global {
  namespace Express {
    interface Request {
      fieldPermissions?: FieldPermissionMap;
    }
  }
}

export function attachFieldPermissions(module: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) { next(); return; }

    const { roleSlug, roleId } = req.user;

    // Superusers see everything — no masking
    if (roleSlug === 'hr' || roleSlug === 'admin') {
      next();
      return;
    }

    try {
      const cache = await loadPermissionsForRole(roleId);
      req.fieldPermissions = cache.fieldPermissions[module] ?? {};
    } catch {
      req.fieldPermissions = {};
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// filterFieldsByPermission — response utility
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Utility function (not a middleware) that filters or masks object fields
 * according to the field permissions attached by `attachFieldPermissions`.
 *
 * Usage in controller:
 *   const safeEmployee = filterFieldsByPermission(employee.toJSON(), req.fieldPermissions);
 *   sendResponse(res, { data: safeEmployee });
 */
export function filterFieldsByPermission<T extends Record<string, unknown>>(
  data: T,
  fieldPermissions?: FieldPermissionMap,
): Partial<T> {
  if (!fieldPermissions || Object.keys(fieldPermissions).length === 0) {
    return data; // No restrictions defined → return everything
  }

  const result = { ...data };

  for (const [field, perms] of Object.entries(fieldPermissions)) {
    if (!(field in result)) continue;

    if (!perms.can_view) {
      // Remove the field entirely
      delete result[field as keyof T];
    } else if (perms.is_masked) {
      // Mask the value (show only last 4 characters)
      const val = result[field as keyof T];
      if (typeof val === 'string' && val.length > 4) {
        (result as any)[field] = '•'.repeat(val.length - 4) + val.slice(-4);
      } else if (typeof val === 'string') {
        (result as any)[field] = '••••';
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// scopeToCompany — multi-tenant isolation guard
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Ensures all queries are scoped to the user's company.
 * Injects `req.companyScope` for use in service methods.
 *
 * Usage:
 *   router.get('/', authenticate, scopeToCompany, handler);
 *
 *   // In service:
 *   Employee.findAll({ where: { company_id: req.companyScope } });
 */

declare global {
  namespace Express {
    interface Request {
      companyScope?: number;
    }
  }
}

export function scopeToCompany(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }
  req.companyScope = req.user.companyId;
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// hasPermission — utility (non-middleware) for service/controller use
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Programmatic permission check for use inside service methods or controllers
 * where you need to conditionally include data rather than reject the request.
 *
 * Usage:
 *   const canSeeStatutory = await hasPermission(req.user.roleId, 'employees:read-sensitive');
 *   if (!canSeeStatutory) excludeFields.push(...SENSITIVE_FIELDS);
 */
export async function hasPermission(roleId: number, slug: string): Promise<boolean> {
  try {
    const cache = await loadPermissionsForRole(roleId);
    return cache.slugs.has(slug);
  } catch {
    return false;
  }
}
