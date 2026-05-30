import { Router, Request, Response, NextFunction } from 'express';
import { body, param }     from 'express-validator';
import { Op }              from 'sequelize';
import { PermissionGroup, GroupPermission, UserGroup, SYSTEM_GROUPS } from '../../database/models/PermissionGroups';
import { Permission }      from '../../database/models/RoleModels';
import { User }            from '../../database/models/User';
import { Employee }        from '../../database/models/Employee';
import { AppError }        from '../../middleware/errorHandler.middleware';
import { authenticate }    from '../../middleware/auth.middleware';
import { authorize, clearPermissionCache } from '../../middleware/rbac.middleware';
import { validate }        from '../../middleware/validate.middleware';
import { sendResponse, sendError } from '../../utils/response';
import { logActivity }     from '../../utils/activityLogger';

// ─── Service ──────────────────────────────────────────────────────────────────

class PermissionGroupService {

  async list(companyId: number) {
    const groups = await PermissionGroup.findAll({
      where: { company_id: companyId },
      include: [{ model: Permission, as: 'permissions', attributes: ['id','slug','module','action'], through: { attributes: [] } }],
      order: [['is_system','DESC'],['name','ASC']],
    });

    // Enrich with member counts
    const groupIds = groups.map(g => g.id);
    const userGroups = await UserGroup.findAll({
      where: { group_id: groupIds, company_id: companyId },
      attributes: ['group_id'],
    });
    const countMap: Record<number,number> = {};
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
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g,'_');
    const exists = await PermissionGroup.findOne({ where: { company_id: companyId, slug } });
    if (exists) throw new AppError('A group with this slug already exists', 409);

    const group = await PermissionGroup.create({
      company_id: companyId,
      name:        dto.name,
      slug,
      description: dto.description || null,
      color:       dto.color || '#1e56d9',
      is_system:   false,
      is_active:   true,
      created_by:  createdBy || null,
    });

    await logActivity({ companyId, userId: createdBy, action: 'PERMISSION_GROUP_CREATED', module: 'settings', entityId: group.id, newValues: { name: group.name } });
    return group;
  }

  async update(id: number, companyId: number, dto: {
    name?: string; description?: string; color?: string; is_active?: boolean;
  }, updatedBy?: number) {
    const group = await this.getById(id, companyId);
    const old = { name: group.name, is_active: group.is_active };
    await group.update(dto as any);
    await logActivity({ companyId, userId: updatedBy, action: 'PERMISSION_GROUP_UPDATED', module: 'settings', entityId: id, oldValues: old, newValues: dto });
    return group;
  }

  async delete(id: number, companyId: number, deletedBy?: number) {
    const group = await this.getById(id, companyId);
    if (group.is_system) throw new AppError('System permission groups cannot be deleted', 403);

    const memberCount = await UserGroup.count({ where: { group_id: id } });
    if (memberCount > 0) throw new AppError(`Cannot delete: ${memberCount} users are assigned to this group`, 409);

    await GroupPermission.destroy({ where: { group_id: id } });
    await group.destroy();
    await logActivity({ companyId, userId: deletedBy, action: 'PERMISSION_GROUP_DELETED', module: 'settings', entityId: id, oldValues: { name: group.name } });
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
    for (const ug of userGroups) clearPermissionCache(ug.user_id);

    await logActivity({ companyId, userId: updatedBy, action: 'PERMISSION_GROUP_PERMISSIONS_UPDATED', module: 'settings', entityId: id, newValues: { slugs } });
    return { updated: permissions.length };
  }

  // ── Member management ────────────────────────────────────────────────────────

  async getMembers(id: number, companyId: number) {
    const userGroups = await UserGroup.findAll({ where: { group_id: id, company_id: companyId } });
    if (!userGroups.length) return [];

    const userIds = userGroups.map(ug => ug.user_id);
    const employees = await Employee.findAll({
      where: { company_id: companyId },
      include: [{ model: User, as: 'user', where: { id: userIds, is_active: true }, attributes: ['id','email','role_id'] }],
      attributes: ['id','first_name','last_name','employee_code'],
    });
    return employees;
  }

  async addMember(groupId: number, companyId: number, userId: number, addedBy?: number) {
    await this.getById(groupId, companyId);
    const user = await User.findOne({ where: { id: userId, company_id: companyId } });
    if (!user) throw new AppError('User not found', 404);

    const [, created] = await UserGroup.findOrCreate({
      where: { group_id: groupId, user_id: userId },
      defaults: { group_id: groupId, user_id: userId, company_id: companyId, assigned_by: addedBy || null },
    });
    if (!created) throw new AppError('User is already in this group', 409);

    clearPermissionCache(userId);
    await logActivity({ companyId, userId: addedBy, action: 'PERMISSION_GROUP_MEMBER_ADDED', module: 'settings', entityId: groupId, newValues: { userId } });
    return { added: true };
  }

  async removeMember(groupId: number, companyId: number, userId: number, removedBy?: number) {
    const deleted = await UserGroup.destroy({ where: { group_id: groupId, user_id: userId, company_id: companyId } });
    if (!deleted) throw new AppError('User is not in this group', 404);
    clearPermissionCache(userId);
    await logActivity({ companyId, userId: removedBy, action: 'PERMISSION_GROUP_MEMBER_REMOVED', module: 'settings', entityId: groupId, newValues: { userId } });
    return { removed: true };
  }

  async getUserGroups(userId: number, companyId: number) {
    return UserGroup.findAll({
      where: { user_id: userId, company_id: companyId },
      include: [{
        model: PermissionGroup, as: 'group',
        where: { is_active: true },
        include: [{ model: Permission, as: 'permissions', through: { attributes: [] }, attributes: ['slug'] }],
      }],
    });
  }

  // ── Seed system groups for a new company ─────────────────────────────────────
  async seedSystemGroups(companyId: number) {
    const allPerms = await Permission.findAll({ attributes: ['id','slug'] });
    const permMap = new Map(allPerms.map(p => [p.slug, p.id]));

    for (const tpl of SYSTEM_GROUPS) {
      const [group] = await PermissionGroup.findOrCreate({
        where:    { company_id: companyId, slug: tpl.slug },
        defaults: {
          company_id: companyId,
          name:        tpl.name,
          slug:        tpl.slug,
          description: tpl.description,
          color:       tpl.color,
          is_system:   tpl.is_system,
          is_active:   true,
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

const svc = new PermissionGroupService();

// ─── Controllers ──────────────────────────────────────────────────────────────

async function listGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.list(req.user!.companyId) }); } catch(e){ next(e); }
}

async function createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.create(req.user!.companyId, req.body, req.user!.userId), statusCode: 201 }); } catch(e){ next(e); }
}

async function updateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.update(+req.params.id, req.user!.companyId, req.body, req.user!.userId) }); } catch(e){ next(e); }
}

async function deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.delete(+req.params.id, req.user!.companyId, req.user!.userId) }); } catch(e){ next(e); }
}

async function setGroupPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.setPermissions(+req.params.id, req.user!.companyId, req.body.slugs, req.user!.userId) }); } catch(e){ next(e); }
}

async function getGroupMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.getMembers(+req.params.id, req.user!.companyId) }); } catch(e){ next(e); }
}

async function addGroupMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.addMember(+req.params.id, req.user!.companyId, req.body.user_id, req.user!.userId), statusCode: 201 }); } catch(e){ next(e); }
}

async function removeGroupMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.removeMember(+req.params.id, req.user!.companyId, +req.params.userId, req.user!.userId) }); } catch(e){ next(e); }
}

async function getMyGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.getUserGroups(req.user!.userId, req.user!.companyId) }); } catch(e){ next(e); }
}

async function seedGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await svc.seedSystemGroups(req.user!.companyId); sendResponse(res, { data: { seeded: true } }); } catch(e){ next(e); }
}

// Export service for use in seeder
export { PermissionGroupService, svc as permissionGroupService };

// ─── Router ───────────────────────────────────────────────────────────────────

export const permissionGroupRouter = Router();
permissionGroupRouter.use(authenticate);

permissionGroupRouter.get ('/me',                          getMyGroups);
permissionGroupRouter.get ('/',                            listGroups);
permissionGroupRouter.post('/',     [body('name').trim().notEmpty()], validate, createGroup);
permissionGroupRouter.put ('/:id',  [param('id').isInt()], validate, updateGroup);
permissionGroupRouter.delete('/:id',[param('id').isInt()], validate, deleteGroup);

permissionGroupRouter.put ('/:id/permissions', [param('id').isInt(), body('slugs').isArray()], validate, setGroupPermissions);
permissionGroupRouter.get ('/:id/members',     [param('id').isInt()], validate, getGroupMembers);
permissionGroupRouter.post('/:id/members',     [param('id').isInt(), body('user_id').isInt()], validate, addGroupMember);
permissionGroupRouter.delete('/:id/members/:userId', [param('id').isInt(), param('userId').isInt()], validate, removeGroupMember);

permissionGroupRouter.post('/seed', seedGroups); // admin only — seed system groups
