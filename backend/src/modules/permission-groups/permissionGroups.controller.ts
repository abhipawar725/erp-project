import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { Op } from 'sequelize';
import { PermissionGroup, GroupPermission, UserGroup, SYSTEM_GROUPS } from '../../database/models/PermissionGroups';
import { Permission } from '../../database/models/RoleModels';
import { User } from '../../database/models/User';
import { Employee } from '../../database/models/Employee';
import { AppError } from '../../middleware/errorHandler.middleware';
import { authenticate, authorize } from '../auth/auth.middleware';
import { clearPermissionCache } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { sendResponse, sendError } from '../../utils/response';
import { logActivity } from '../../utils/activityLogger';
import { broadcastAfter } from '../../middleware/permissionBroadcast.middleware';
import {EmployeePermission} from "../../database/models/EmployeePermission"

// ─── Service ──────────────────────────────────────────────────────────────────

class PermissionGroupService {

  async list(companyId: number) {
    const groups = await PermissionGroup.findAll({
      where: { company_id: companyId },
      include: [{ model: Permission, as: 'permissions', attributes: ['id', 'slug', 'module', 'action'], through: { attributes: [] } }],
      order: [['is_system', 'DESC'], ['name', 'ASC']],
    });

    // Enrich with member counts
    const groupIds = groups.map(g => g.id);
    const userGroups = await UserGroup.findAll({
      where: { group_id: groupIds, company_id: companyId },
      attributes: ['group_id'],
    });
    const countMap: Record<number, number> = {};
    for (const ug of userGroups) countMap[ug.group_id] = (countMap[ug.group_id] || 0) + 1;

    return groups.map(g => ({
      ...g.toJSON(),
      member_count: countMap[g.id] || 0,
    }));
  }

  async getById(id: number, companyId: number) {
    const group = await PermissionGroup.findOne({
      where: { id, company_id: companyId },
      include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
    });
    if (!group) throw new AppError('Permission group not found', 404);
    return group;
  }

  async create(companyId: number, dto: {
    name: string; description?: string; color?: string; slug?: string;
  }, createdBy?: number) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const exists = await PermissionGroup.findOne({ where: { company_id: companyId, slug } });
    if (exists) throw new AppError('A group with this slug already exists', 409);

    const group = await PermissionGroup.create({
      company_id: companyId,
      name: dto.name,
      slug,
      description: dto.description || null,
      color: dto.color || '#1e56d9',
      is_system: false,
      is_active: true,
      created_by: createdBy || null,
    });

    await logActivity({ companyId, employeeId: createdBy, action: 'PERMISSION_GROUP_CREATED', module: 'settings', entityId: group.id, newValues: { name: group.name } });
    return group;
  }

  async update(id: number, companyId: number, dto: {
    name?: string; description?: string; color?: string; is_active?: boolean;
  }, updatedBy?: number) {
    const group = await this.getById(id, companyId);
    const old = { name: group.name, is_active: group.is_active };
    const { name, description, color, is_active } = dto;
    await group.update({ name, description, color, is_active });
    await logActivity({ companyId, employeeId: updatedBy, action: 'PERMISSION_GROUP_UPDATED', module: 'settings', entityId: id, oldValues: old, newValues: dto });
    return group;
  }

  async delete(id: number, companyId: number, deletedBy?: number) {
    const group = await this.getById(id, companyId);
    if (group.is_system) throw new AppError('System permission groups cannot be deleted', 403);

    const memberCount = await UserGroup.count({ where: { group_id: id } });
    if (memberCount > 0) throw new AppError(`Cannot delete: ${memberCount} users are assigned to this group`, 409);

    await GroupPermission.destroy({ where: { group_id: id } });
    await group.destroy();
    await logActivity({ companyId, employeeId: deletedBy, action: 'PERMISSION_GROUP_DELETED', module: 'settings', entityId: id, oldValues: { name: group.name } });
    return { deleted: true };
  }

  // ── Permission assignment ────────────────────────────────────────────────────

  async setPermissions(id: number, companyId: number, slugs: string[], updatedBy?: number) {
    await this.getById(id, companyId);
    const permissions = await Permission.findAll({ where: { slug: slugs } });
    await GroupPermission.destroy({ where: { group_id: id } });
    await GroupPermission.bulkCreate(permissions.map(p => ({ group_id: id, permission_id: p.id })));

    // Invalidate cache for all users in this group
    const userGroups = await UserGroup.findAll({ where: { group_id: id } });

    for (const ug of userGroups) clearPermissionCache(ug.employee_id);

    await logActivity({ companyId, employeeId: updatedBy, action: 'PERMISSION_GROUP_PERMISSIONS_UPDATED', module: 'settings', entityId: id, newValues: { slugs } });
    return { groupId: id, slugs, updated: permissions.length };
  }

async getEmployeePermissions(
  employeeId: number,
  companyId: number
) {
  const groups = await UserGroup.findAll({
    where: {
      employee_id: employeeId,
      company_id: companyId,
    },
  });

  const groupIds = groups.map(g => g.group_id);

  const groupPermissions = await GroupPermission.findAll({
    where: {
      group_id: groupIds,
    },
    include: [
      {
        model: Permission,
      },
    ],
  });

  const overrides = await EmployeePermission.findAll({
    where: {
      employee_id: employeeId,
      company_id: companyId,
    },
    include: [
      {
        model: Permission,
      },
    ],
  });

  const finalPermissions = new Set<string>();

  for (const gp of groupPermissions) {
    finalPermissions.add(
      (gp as any).Permission.slug
    );
  }

  const grants = overrides.filter(
    o => o.type === 'grant'
  );

  const revokes = overrides.filter(
    o => o.type === 'revoke'
  );

  for (const grant of grants) {
    finalPermissions.add(
      (grant as any).Permission.slug
    );
  }

  for (const revoke of revokes) {
    finalPermissions.delete(
      (revoke as any).Permission.slug
    );
  }

  return [...finalPermissions];
}

  // ── Member management ────────────────────────────────────────────────────────

  async getMembers(id: number, companyId: number) {
    const userGroups = await UserGroup.findAll({ where: { group_id: id, company_id: companyId } });
    if (!userGroups.length) return [];

    const employeeIds = userGroups.map(ug => ug.employee_id);
    return Employee.findAll({
      where: { id: employeeIds, company_id: companyId },
      attributes: ['id', 'first_name', 'last_name', 'employee_code'],
    });
  }
  async addMember(groupId: number, companyId: number, employeeId: number, addedBy?: number) {
    await this.getById(groupId, companyId);
    const emp = await Employee.findOne({ where: { id: employeeId, company_id: companyId } });
    if (!emp) throw new AppError('User not found', 404);

    const [, created] = await UserGroup.findOrCreate({
      where: { group_id: groupId, employee_id: employeeId },
      defaults: { group_id: groupId, employee_id: employeeId, company_id: companyId, assigned_by: addedBy || null },
    });
    if (!created) throw new AppError('User is already in this group', 409);

    clearPermissionCache(employeeId);
    await logActivity({ companyId, employeeId: addedBy, action: 'PERMISSION_GROUP_MEMBER_ADDED', module: 'settings', entityId: groupId, newValues: { employeeId } });
    return { employeeId, groupId, action: 'member_added' };
  }

  async removeMember(groupId: number, companyId: number, employeeId: number, removedBy?: number) {
    const deleted = await UserGroup.destroy({ where: { group_id: groupId, employee_id: employeeId, company_id: companyId } });
    if (!deleted) throw new AppError('User is not in this group', 404);
    clearPermissionCache(employeeId);
    await logActivity({ companyId, employeeId: removedBy, action: 'PERMISSION_GROUP_MEMBER_REMOVED', module: 'settings', entityId: groupId, newValues: { employeeId } });
    return { employeeId, groupId, action: 'member_removed' };
  }

  async getUserGroups(employeeId: number, companyId: number) {
    return PermissionGroup.findAll({
      where: { company_id: companyId, is_active: true },
      include: [
        { model: Employee, as: 'members', where: { id: employeeId }, attributes: [], through: { attributes: [] } },
        { model: Permission, as: 'permissions', through: { attributes: [] }, attributes: ['slug'] },
      ],
    });
  }

  // ── Seed system groups for a new company ─────────────────────────────────────
  async seedSystemGroups(companyId: number) {
    const allPerms = await Permission.findAll({ attributes: ['id', 'slug'] });
    const permMap = new Map(allPerms.map(p => [p.slug, p.id]));

    for (const tpl of SYSTEM_GROUPS) {
      const [group] = await PermissionGroup.findOrCreate({
        where: { company_id: companyId, slug: tpl.slug },
        defaults: {
          company_id: companyId,
          name: tpl.name,
          slug: tpl.slug,
          description: tpl.description,
          color: tpl.color,
          is_system: tpl.is_system,
          is_active: true,
        },
      });

      // Assign permissions
      const permIds = (tpl.slug_grants as readonly string[])
        .map(s => permMap.get(s))
        .filter(Boolean) as number[];

      if (permIds.length) {
        await GroupPermission.destroy({ where: { group_id: group.id } });
        await GroupPermission.bulkCreate(permIds.map(pid => ({ group_id: group.id, permission_id: pid })), { ignoreDuplicates: true });
      }
    }
  }
}

class EmployeePermissionService {
  async setOverrides(
    employeeId: number,
    companyId: number,
    grants: string[],
    revokes: string[],
    updatedBy?: number
  ) {
    const permissions = await Permission.findAll();

    const permissionMap = new Map(
      permissions.map(p => [p.slug, p.id])
    );

    await EmployeePermission.destroy({
      where: {
        employee_id: employeeId,
        company_id: companyId,
      },
    });

    const rows = [
      ...grants
        .filter(s => permissionMap.has(s))
        .map(slug => ({
          company_id: companyId,
          employee_id: employeeId,
          permission_id: permissionMap.get(slug)!,
          type: 'grant' as const,
          created_by: updatedBy,
        })),

      ...revokes
        .filter(s => permissionMap.has(s))
        .map(slug => ({
          company_id: companyId,
          employee_id: employeeId,
          permission_id: permissionMap.get(slug)!,
          type: 'revoke' as const,
          created_by: updatedBy,
        })),
    ];

    await EmployeePermission.bulkCreate(rows);

    clearPermissionCache(employeeId);

    return {
      employeeId,
      grants,
      revokes,
    };
  }
}

const svc = new PermissionGroupService();

// ─── Controllers ──────────────────────────────────────────────────────────────

async function listGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.list(req.user!.companyId) }); } catch (e) { next(e); }
}

async function createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.create(req.user!.companyId, req.body, req.user!.employeeId), statusCode: 201 }); } catch (e) { next(e); }
}

async function updateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.update(+req.params.id, req.user!.companyId, req.body, req.user!.employeeId) }); } catch (e) { next(e); }
}

async function deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.delete(+req.params.id, req.user!.companyId, req.user!.employeeId) }); } catch (e) { next(e); }
}

async function getGroupPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const group = await svc.getById(+req.params.id, req.user!.companyId);
    const slugs = ((group as any).permissions ?? []).map((p: any) => p.slug);
    sendResponse(res, { data: slugs });
  } catch (e) { next(e); }
}

async function setGroupPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.setPermissions(+req.params.id, req.user!.companyId, req.body.slugs, req.user!.employeeId) }); } catch (e) { next(e); }
}

async function getGroupMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.getMembers(+req.params.id, req.user!.companyId) }); } catch (e) { next(e); }
}

async function addGroupMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.addMember(+req.params.id, req.user!.companyId, req.body.employee_id, req.user!.employeeId), statusCode: 201 }); } catch (e) { next(e); }
}

async function removeGroupMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.removeMember(+req.params.id, req.user!.companyId, +req.params.employeeId, req.user!.employeeId) }); } catch (e) { next(e); }
}

async function getMyGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.getUserGroups(req.user!.employeeId, req.user!.companyId) }); } catch (e) { next(e); }
}

async function seedGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await svc.seedSystemGroups(req.user!.companyId); sendResponse(res, { data: { seeded: true } }); } catch (e) { next(e); }
}

// Export service for use in seeder
export { PermissionGroupService, svc as permissionGroupService };

// ─── Router ───────────────────────────────────────────────────────────────────

export const permissionGroupRouter = Router();
permissionGroupRouter.use(authenticate);

permissionGroupRouter.get('/me', getMyGroups);
permissionGroupRouter.get('/', listGroups);
permissionGroupRouter.post('/', [body('name').trim().notEmpty()], validate, createGroup);
permissionGroupRouter.put('/:id', [param('id').isInt()], validate, updateGroup);
permissionGroupRouter.delete('/:id', [param('id').isInt()], validate, deleteGroup);

permissionGroupRouter.get('/:id/permissions', [param('id').isInt()], validate, getGroupPermissions);
permissionGroupRouter.put('/:id/permissions', [param('id').isInt(), body('slugs').isArray()], validate, broadcastAfter('bulk_permissions_updated'), setGroupPermissions);
permissionGroupRouter.get('/:id/members', [param('id').isInt()], validate, getGroupMembers);
permissionGroupRouter.post('/:id/members', [param('id').isInt(), body('employee_id').isInt()], validate, broadcastAfter('permissions_updated'), addGroupMember);
permissionGroupRouter.delete('/:id/members/:employeeId', [param('id').isInt(), param('employeeId').isInt()], validate, broadcastAfter('permissions_updated'), removeGroupMember);

permissionGroupRouter.post('/seed', seedGroups);
