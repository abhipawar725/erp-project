import { Op } from 'sequelize';
import { Role, Permission, RolePermission } from '../../database/models/RoleModels';
import { RoleAssignment }                    from '../../database/models/FormBuilder';
import { User }                              from '../../database/models/User';
import { Employee }                          from '../../database/models/Employee';
import { AppError }                          from '../../middleware/errorHandler.middleware';
import { clearPermissionCache }              from '../../middleware/rbac.middleware';
import { logActivity }                       from '../../utils/activityLogger';

const SYSTEM_SLUGS = ['super_admin','company_admin','hr','employee','candidate'];

export class RolesService {

  // ─── List roles ─────────────────────────────────────────────────────────────
  async list(companyId: number) {
    const roles = await Role.findAll({
      where: { company_id: companyId },
      order: [['is_system','DESC'],['name','ASC']],
    });

    // Enrich with member counts
    const roleIds = roles.map(r => r.id);
    const assignments = await RoleAssignment.findAll({
      where: { company_id: companyId, role_id: roleIds },
      attributes: ['role_id'],
    });

    const countMap: Record<number,number> = {};
    for (const a of assignments) {
      countMap[a.role_id] = (countMap[a.role_id] || 0) + 1;
    }

    return roles.map(r => ({ ...r.toJSON(), member_count: countMap[r.id] || 0 }));
  }

  async getById(id: number, companyId: number) {
    const role = await Role.findOne({ where: { id, company_id: companyId } });
    if (!role) throw new AppError('Role not found', 404);
    return role;
  }

  // ─── Create custom role ──────────────────────────────────────────────────────
  async create(companyId: number, dto: {
    name: string; slug?: string; description?: string;
  }, createdBy?: number) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    const exists = await Role.findOne({ where: { company_id: companyId, slug } });
    if (exists) throw new AppError('A role with this slug already exists', 409);

    const role = await Role.create({
      company_id:  companyId,
      name:        dto.name,
      slug,
      description: dto.description || null,
      is_system:   false,
    });

    await logActivity({ companyId, userId: createdBy, action: 'ROLE_CREATED', module: 'roles', entityId: role.id, newValues: { name: role.name, slug } });
    return role;
  }

  // ─── Update role ─────────────────────────────────────────────────────────────
  async update(id: number, companyId: number, dto: {
    name?: string; description?: string;
  }, updatedBy?: number) {
    const role = await this.getById(id, companyId);
    const oldValues = { name: role.name, description: role.description };

    await role.update({ name: dto.name || role.name, description: dto.description ?? role.description });

    clearPermissionCache(id);
    await logActivity({ companyId, userId: updatedBy, action: 'ROLE_UPDATED', module: 'roles', entityId: id, oldValues, newValues: dto });
    return role;
  }

  // ─── Delete role ─────────────────────────────────────────────────────────────
  async delete(id: number, companyId: number, deletedBy?: number) {
    const role = await this.getById(id, companyId);
    if (role.is_system) throw new AppError('System roles cannot be deleted', 403);

    // Unassign all members first
    await RoleAssignment.destroy({ where: { role_id: id } });
    await role.destroy();

    clearPermissionCache(id);
    await logActivity({ companyId, userId: deletedBy, action: 'ROLE_DELETED', module: 'roles', entityId: id, oldValues: { name: role.name } });
    return { deleted: true };
  }

  // ─── Permission assignment ───────────────────────────────────────────────────
  async getPermissions(roleId: number, companyId: number) {
    await this.getById(roleId, companyId);
    const rps = await RolePermission.findAll({
      where: { role_id: roleId },
      include: [{ model: Permission, as: 'permission' }],
    });
    return rps.map(rp => (rp as any).permission?.slug).filter(Boolean);
  }

  async setPermissions(roleId: number, companyId: number, permSlugs: string[], updatedBy?: number) {
    await this.getById(roleId, companyId);
    const permissions = await Permission.findAll({ where: { slug: permSlugs } });

    // Replace all
    await RolePermission.destroy({ where: { role_id: roleId } });
    await RolePermission.bulkCreate(permissions.map(p => ({ role_id: roleId, permission_id: p.id })));

    clearPermissionCache(roleId);
    await logActivity({ companyId, userId: updatedBy, action: 'ROLE_PERMISSIONS_UPDATED', module: 'roles', entityId: roleId, newValues: { slugs: permSlugs } });
    return { updated: true, count: permissions.length };
  }

  // ─── Member management ───────────────────────────────────────────────────────
  async getMembers(roleId: number, companyId: number) {
    const assignments = await RoleAssignment.findAll({
      where: { role_id: roleId, company_id: companyId },
    });
    if (!assignments.length) return [];

    const userIds = assignments.map(a => a.user_id);
    const employees = await Employee.findAll({
      where: { company_id: companyId },
      include: [{ model: User, as: 'user', where: { id: userIds }, attributes: ['id','email'] }],
      attributes: ['id','first_name','last_name','employee_code'],
    });
    return employees;
  }

  async assignMember(roleId: number, companyId: number, userId: number, assignedBy?: number) {
    await this.getById(roleId, companyId);
    const [assignment, created] = await RoleAssignment.findOrCreate({
      where: { role_id: roleId, user_id: userId },
      defaults: { role_id: roleId, user_id: userId, company_id: companyId, assigned_by: assignedBy || null },
    });
    if (!created) throw new AppError('User already has this role', 409);
    return assignment;
  }

  async removeMember(roleId: number, companyId: number, userId: number) {
    const deleted = await RoleAssignment.destroy({ where: { role_id: roleId, user_id: userId, company_id: companyId } });
    if (!deleted) throw new AppError('Assignment not found', 404);
    return { removed: true };
  }

  async listAllPermissions() {
    return Permission.findAll({ order: [['module','ASC'],['action','ASC']] });
  }
}
