import { Op } from 'sequelize';
import {
  UserModulePermission, UserFieldPermission,
  MODULE_FIELDS, SENSITIVE_FIELDS, SYSTEM_MODULES,
  type SystemModule,
} from '../../database/models/UserPermission';
import { User }    from '../../database/models/User';
import { AppError } from '../../middleware/errorHandler.middleware';
import { logActivity } from '../../utils/activityLogger';
import { maskValue } from '../../utils/fieldMask';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FieldPermResolved {
  field_name:  string;
  can_view:    boolean;
  can_edit:    boolean;
  is_masked:   boolean;
  is_hidden:   boolean;
  is_readonly: boolean;
}

export interface ModulePermResolved {
  module:     SystemModule;
  can_view:   boolean;
  can_create: boolean;
  can_edit:   boolean;
  can_delete: boolean;
  can_approve:boolean;
  can_export: boolean;
}

// ─── In-memory cache (TTL = 10 min) ──────────────────────────────────────────

const CACHE: Map<string, { data: unknown; ts: number }> = new Map();
const TTL = 10 * 60 * 1000;

function cacheGet<T>(key: string): T | null {
  const hit = CACHE.get(key);
  if (!hit || Date.now() - hit.ts > TTL) return null;
  return hit.data as T;
}
function cacheSet(key: string, data: unknown) { CACHE.set(key, { data, ts: Date.now() }); }
export function clearUserPermCache(userId?: number) {
  if (userId) { for (const k of CACHE.keys()) { if (k.startsWith(`u:${userId}:`)) CACHE.delete(k); } }
  else CACHE.clear();
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class UserPermissionsService {

  // ── Module permissions ─────────────────────────────────────────────────────

  async getModulePerms(userId: number, companyId: number): Promise<ModulePermResolved[]> {
    const cacheKey = `u:${userId}:modules`;
    const cached = cacheGet<ModulePermResolved[]>(cacheKey);
    if (cached) return cached;

    const rows = await UserModulePermission.findAll({
      where: { user_id: userId, company_id: companyId },
    });

    const rowMap = new Map(rows.map(r => [r.module, r]));

    const result: ModulePermResolved[] = SYSTEM_MODULES.map(module => {
      const r = rowMap.get(module);
      return {
        module,
        can_view:    r?.can_view    ?? false,
        can_create:  r?.can_create  ?? false,
        can_edit:    r?.can_edit    ?? false,
        can_delete:  r?.can_delete  ?? false,
        can_approve: r?.can_approve ?? false,
        can_export:  r?.can_export  ?? false,
      };
    });

    cacheSet(cacheKey, result);
    return result;
  }

  async setModulePerms(
    userId: number, companyId: number,
    perms: { module: SystemModule; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; can_approve: boolean; can_export: boolean }[],
    setBy?: number,
  ) {
    for (const p of perms) {
      await UserModulePermission.upsert({
        user_id: userId, company_id: companyId,
        module:      p.module,
        can_view:    p.can_view,
        can_create:  p.can_create,
        can_edit:    p.can_edit,
        can_delete:  p.can_delete,
        can_approve: p.can_approve,
        can_export:  p.can_export,
        created_by:  setBy ?? null,
      });
    }
    clearUserPermCache(userId);
    await logActivity({ companyId, userId: setBy, action: 'USER_MODULE_PERMS_UPDATED', module: 'permissions', newValues: { targetUserId: userId, count: perms.length } });
    return { updated: perms.length };
  }

  // ── Field permissions ──────────────────────────────────────────────────────

  async getFieldPerms(userId: number, companyId: number, module: SystemModule): Promise<FieldPermResolved[]> {
    const cacheKey = `u:${userId}:fields:${module}`;
    const cached = cacheGet<FieldPermResolved[]>(cacheKey);
    if (cached) return cached;

    const rows = await UserFieldPermission.findAll({
      where: { user_id: userId, company_id: companyId, module },
    });

    const rowMap = new Map(rows.map(r => [r.field_name, r]));
    const fields = MODULE_FIELDS[module] || [];

    const result: FieldPermResolved[] = fields.map(field_name => {
      const r = rowMap.get(field_name);
      const isSensitive = SENSITIVE_FIELDS.includes(field_name);
      return {
        field_name,
        can_view:   r?.can_view    ?? true,
        can_edit:   r?.can_edit    ?? true,
        is_masked:  r?.is_masked   ?? isSensitive,
        is_hidden:  r?.is_hidden   ?? false,
        is_readonly:r?.is_readonly ?? false,
      };
    });

    cacheSet(cacheKey, result);
    return result;
  }

  async setFieldPerms(
    userId: number, companyId: number, module: SystemModule,
    perms: Partial<FieldPermResolved>[],
    setBy?: number,
  ) {
    for (const p of perms) {
      if (!p.field_name) continue;
      await UserFieldPermission.upsert({
        user_id: userId, company_id: companyId, module,
        field_name:  p.field_name,
        can_view:    p.can_view    ?? true,
        can_edit:    p.can_edit    ?? true,
        is_masked:   p.is_masked   ?? false,
        is_hidden:   p.is_hidden   ?? false,
        is_readonly: p.is_readonly ?? false,
        created_by:  setBy ?? null,
      });
    }
    clearUserPermCache(userId);
    await logActivity({ companyId, userId: setBy, action: 'USER_FIELD_PERMS_UPDATED', module: 'permissions', newValues: { targetUserId: userId, module, count: perms.length } });
    return { updated: perms.length };
  }

  // ── Resolve: apply field permissions to a data object ─────────────────────
  // Used by controllers before sending response
  applyFieldPerms<T extends Record<string, unknown>>(
    data: T,
    fieldPerms: FieldPermResolved[],
  ): Partial<T> {
    const result = { ...data };
    const permMap = new Map(fieldPerms.map(p => [p.field_name, p]));

    for (const [key] of Object.entries(data)) {
      const perm = permMap.get(key);
      if (!perm) continue; // not in registry → pass through

      if (perm.is_hidden || !perm.can_view) {
        delete result[key]; // completely remove
      } else if (perm.is_masked && result[key] != null) {
        (result as any)[key] = maskValue(String(result[key]), key);
      }
    }

    return result;
  }

  // ── Admin: list users with their permission summary ────────────────────────
  async listUsersWithPerms(companyId: number) {
    const users = await User.findAll({
      where: { company_id: companyId, is_active: true },
      attributes: ['id','email','role_id'],
      order: [['email','ASC']],
    });

    const userIds = users.map(u => u.id);

    const [modulePerms, fieldPerms] = await Promise.all([
      UserModulePermission.findAll({ where: { company_id: companyId, user_id: userIds } }),
      UserFieldPermission.findAll({
        where: { company_id: companyId, user_id: userIds },
        attributes: ['user_id','module'],
        group: ['user_id','module'],
      }),
    ]);

    const moduleMap = new Map<number, string[]>();
    for (const p of modulePerms) {
      if (!p.can_view) continue;
      const arr = moduleMap.get(p.user_id) || [];
      arr.push(p.module);
      moduleMap.set(p.user_id, arr);
    }

    const customFieldMap = new Set(fieldPerms.map(p => p.user_id));

    return users.map(u => ({
      id:             u.id,
      email:          u.email,
      role_id:        u.role_id,
      accessible_modules: moduleMap.get(u.id) || [],
      has_custom_field_perms: customFieldMap.has(u.id),
    }));
  }

  // ── Copy permissions from one user to another ─────────────────────────────
  async copyPerms(fromUserId: number, toUserId: number, companyId: number, copiedBy?: number) {
    const [modulePerms, fieldPerms] = await Promise.all([
      UserModulePermission.findAll({ where: { user_id: fromUserId, company_id: companyId } }),
      UserFieldPermission.findAll({ where: { user_id: fromUserId, company_id: companyId } }),
    ]);

    // Remove existing perms for target
    await UserModulePermission.destroy({ where: { user_id: toUserId, company_id: companyId } });
    await UserFieldPermission.destroy({ where: { user_id: toUserId, company_id: companyId } });

    // Copy module perms
    await UserModulePermission.bulkCreate(modulePerms.map(p => ({
      company_id: companyId, user_id: toUserId,
      module: p.module,
      can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit,
      can_delete: p.can_delete, can_approve: p.can_approve, can_export: p.can_export,
      created_by: copiedBy ?? null,
    })));

    // Copy field perms
    await UserFieldPermission.bulkCreate(fieldPerms.map(p => ({
      company_id: companyId, user_id: toUserId,
      module: p.module, field_name: p.field_name,
      can_view: p.can_view, can_edit: p.can_edit,
      is_masked: p.is_masked, is_hidden: p.is_hidden, is_readonly: p.is_readonly,
      created_by: copiedBy ?? null,
    })));

    clearUserPermCache(toUserId);
    await logActivity({ companyId, userId: copiedBy, action: 'USER_PERMS_COPIED', module: 'permissions', newValues: { from: fromUserId, to: toUserId } });
    return { module_perms: modulePerms.length, field_perms: fieldPerms.length };
  }
}
