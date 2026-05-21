import { Op, WhereOptions, fn, col, literal } from 'sequelize';
import { Department }  from '../../database/models/Department';
import { Designation } from '../../database/models/Designation';
import { Employee }    from '../../database/models/Employee';
import { AppError }    from '../../middleware/errorHandler.middleware';
import { logActivity } from '../../utils/activityLogger';

export interface CreateDepartmentDto {
  name:       string;
  code?:      string | null;
  head_id?:   number | null;
  parent_id?: number | null;
}

export interface UpdateDepartmentDto {
  name?:      string;
  code?:      string | null;
  head_id?:   number | null;
  parent_id?: number | null;
  is_active?: boolean;
}

export interface DepartmentQueryParams {
  search?:    string;
  is_active?: string | boolean;
  parent_id?: string | number;
}

export class DepartmentService {

  // ─── List (with employee count + head + designations) ─────────────────────
  async getAll(companyId: number, query: DepartmentQueryParams = {}) {
    const where: WhereOptions = { company_id: companyId };

    // Default to active only unless explicitly asked for inactive
    if (query.is_active === 'false' || query.is_active === false) {
      where['is_active'] = false;
    } else if (query.is_active === 'all') {
      // no filter
    } else {
      where['is_active'] = true;
    }

    if (query.search) {
      (where as any)[Op.or] = [
        { name: { [Op.like]: `%${query.search}%` } },
        { code: { [Op.like]: `%${query.search}%` } },
      ];
    }

    if (query.parent_id !== undefined) {
      where['parent_id'] = query.parent_id ? Number(query.parent_id) : null;
    }

    const departments = await Department.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        {
          model:      Employee,
          as:         'head',
          attributes: ['id', 'first_name', 'last_name', 'avatar_url', 'designation_id'],
          required:   false,
        },
        {
          model:      Designation,
          as:         'designations',
          attributes: ['id', 'name', 'grade'],
          required:   false,
        },
        {
          model:      Department,
          as:         'parent',
          attributes: ['id', 'name', 'code'],
          required:   false,
        },
        {
          model:      Department,
          as:         'children',
          attributes: ['id', 'name', 'code', 'is_active'],
          required:   false,
        },
      ],
    });

    // Attach employee count per department
    const deptIds = departments.map((d) => d.id);
    const empCounts = await Employee.findAll({
      where: { department_id: deptIds, status: ['Active', 'On_Probation'] },
      attributes: ['department_id', [fn('COUNT', col('id')), 'count']],
      group: ['department_id'],
      raw: true,
    });

    const countMap = new Map<number, number>(
      empCounts.map((r: any) => [r.department_id, Number(r.count)]),
    );

    return departments.map((d) => ({
      ...d.toJSON(),
      employee_count: countMap.get(d.id) ?? 0,
    }));
  }

  // ─── Single (full detail with employees list) ─────────────────────────────
  async getById(id: number, companyId: number) {
    const dept = await Department.findOne({
      where: { id, company_id: companyId },
      include: [
        {
          model:      Employee,
          as:         'head',
          attributes: ['id', 'first_name', 'last_name', 'avatar_url'],
          required:   false,
        },
        {
          model:      Designation,
          as:         'designations',
          attributes: ['id', 'name', 'grade'],
          required:   false,
        },
        {
          model:      Department,
          as:         'parent',
          attributes: ['id', 'name', 'code'],
          required:   false,
        },
        {
          model:      Department,
          as:         'children',
          attributes: ['id', 'name', 'code', 'is_active'],
          required:   false,
        },
        {
          model:      Employee,
          as:         'employees',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'status', 'avatar_url', 'designation_id'],
          where:      { status: ['Active', 'On Probation'] },
          required:   false,
        },
      ],
    });

    if (!dept) throw new AppError('Department not found', 404);
    return dept;
  }

  // ─── Summary stats ────────────────────────────────────────────────────────
  async getStats(companyId: number) {
    const [total, active, withHead] = await Promise.all([
      Department.count({ where: { company_id: companyId } }),
      Department.count({ where: { company_id: companyId, is_active: true } }),
      Department.count({ where: { company_id: companyId, is_active: true, head_id: { [Op.ne]: null } } }),
    ]);

    const empCounts = await Employee.findAll({
      where: { status: ['Active', 'On Probation'] },
      include: [{
        model:      Department,
        as:         'department',
        where:      { company_id: companyId },
        attributes: [],
        required:   true,
      }],
      attributes: ['department_id', [fn('COUNT', col('Employee.id')), 'count']],
      group: ['department_id'],
      raw: true,
    });

    const largest = empCounts.reduce(
      (max: any, r: any) => (Number(r.count) > Number(max?.count ?? 0) ? r : max),
      null,
    );

    return {
      total,
      active,
      inactive: total - active,
      withHead,
      withoutHead: active - withHead,
      largestDeptId: largest ? Number(largest.department_id) : null,
      largestDeptCount: largest ? Number(largest.count) : 0,
    };
  }

  // ─── Create ───────────────────────────────────────────────────────────────
  async create(companyId: number, dto: CreateDepartmentDto, createdBy?: number) {
    // Duplicate name check within same company
    const existing = await Department.findOne({
      where: { company_id: companyId, name: dto.name.trim(), is_active: true },
    });
    if (existing) throw new AppError(`Department "${dto.name}" already exists`, 409);

    // Validate parent belongs to same company
    if (dto.parent_id) {
      const parent = await Department.findOne({ where: { id: dto.parent_id, company_id: companyId } });
      if (!parent) throw new AppError('Parent department not found', 404);
    }

    const dept = await Department.create({
      company_id: companyId,
      name:       dto.name.trim(),
      code:       dto.code?.toUpperCase().trim() || null,
      head_id:    dto.head_id   ?? null,
      parent_id:  dto.parent_id ?? null,
      is_active:  true,
      created_by: createdBy ?? null,
    });

    await logActivity({
      companyId, userId: createdBy,
      action: 'DEPARTMENT_CREATED', module: 'departments', entityId: dept.id,
      newValues: { name: dept.name, code: dept.code },
    });

    return this.getById(dept.id, companyId);
  }

  // ─── Update ───────────────────────────────────────────────────────────────
  async update(id: number, companyId: number, dto: UpdateDepartmentDto, updatedBy?: number) {
    const dept = await Department.findOne({ where: { id, company_id: companyId } });
    if (!dept) throw new AppError('Department not found', 404);

    const before = { name: dept.name, code: dept.code, head_id: dept.head_id, is_active: dept.is_active };

    // Prevent self as parent
    if (dto.parent_id && dto.parent_id === id)
      throw new AppError('A department cannot be its own parent', 400);

    await dept.update({
      name:       dto.name?.trim()               ?? dept.name,
      code:       dto.code?.toUpperCase().trim() ?? dept.code,
      head_id:    dto.head_id   !== undefined ? dto.head_id   : dept.head_id,
      parent_id:  dto.parent_id !== undefined ? dto.parent_id : dept.parent_id,
      is_active:  dto.is_active !== undefined ? dto.is_active : dept.is_active,
      updated_by: updatedBy ?? null,
    });

    await logActivity({
      companyId, userId: updatedBy,
      action: 'DEPARTMENT_UPDATED', module: 'departments', entityId: id,
      oldValues: before as Record<string, unknown>,
      newValues: { name: dept.name, code: dept.code, is_active: dept.is_active },
    });

    return this.getById(id, companyId);
  }

  // ─── Soft delete ──────────────────────────────────────────────────────────
  async delete(id: number, companyId: number, deletedBy?: number) {
    const dept = await Department.findOne({ where: { id, company_id: companyId } });
    if (!dept) throw new AppError('Department not found', 404);

    const empCount = await Employee.count({
      where: { department_id: id, status: ['Active', 'On Probation'] },
    });
    if (empCount > 0)
      throw new AppError(
        `Cannot delete "${dept.name}" — ${empCount} active employee(s) are assigned. Reassign them first.`,
        409,
      );

    const childCount = await Department.count({ where: { parent_id: id, is_active: true } });
    if (childCount > 0)
      throw new AppError(
        `Cannot delete "${dept.name}" — it has ${childCount} active sub-department(s). Delete or reassign them first.`,
        409,
      );

    await dept.update({ is_active: false, deleted_by: deletedBy ?? null });
    await dept.destroy();

    await logActivity({
      companyId, userId: deletedBy,
      action: 'DEPARTMENT_DELETED', module: 'departments', entityId: id,
      oldValues: { name: dept.name },
    });
  }
}
