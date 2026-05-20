import { Department } from '../../database/models/Department';
import { Designation } from '../../database/models/Designation';
import { Employee } from '../../database/models/Employee';
import { AppError } from '../../middleware/errorHandler.middleware';
import { logActivity } from '../../utils/activityLogger';

export interface CreateDepartmentDto {
  name: string;
  code?: string;
  head_id?: number | null;
  parent_id?: number | null;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  head_id?: number | null;
  parent_id?: number | null;
  is_active?: boolean;
}

export class DepartmentService {
  // ─── List all active departments ───────────────────────────────────────────
  async getAll(companyId: number) {
    return Department.findAll({
      where:   { company_id: companyId, is_active: true },
      order:   [['name', 'ASC']],
      include: [
        { model: Employee, as: 'employees', attributes: ['id', 'first_name', 'last_name', 'avatar_url'], required: false },
        { model: Designation, as: 'designations', attributes: ['id', 'name', 'grade'], required: false },
      ],
    });
  }

  // ─── Single department ────────────────────────────────────────────────────
  async getById(id: number, companyId: number) {
    const dept = await Department.findOne({
      where: { id, company_id: companyId },
      include: [
        { model: Employee, as: 'head', attributes: ['id', 'first_name', 'last_name'], required: false },
      ],
    });
    if (!dept) throw new AppError('Department not found', 404);
    return dept;
  }

  // ─── Create ───────────────────────────────────────────────────────────────
  async create(companyId: number, dto: CreateDepartmentDto, createdBy?: number) {
    const dept = await Department.create({
      company_id: companyId,
      name:       dto.name.trim(),
      code:       dto.code?.toUpperCase().trim() ?? null,
      head_id:    dto.head_id   ?? null,
      parent_id:  dto.parent_id ?? null,
      is_active:  true,
      created_by: createdBy ?? null,
    });

    await logActivity({
      companyId,
      userId:    createdBy,
      action:    'DEPARTMENT_CREATED',
      module:    'departments',
      entityId:  dept.id,
      newValues: { name: dept.name, code: dept.code },
    });

    return dept;
  }

  // ─── Update ───────────────────────────────────────────────────────────────
  async update(id: number, companyId: number, dto: UpdateDepartmentDto, updatedBy?: number) {
    const dept = await this.getById(id, companyId);
    const before = { name: dept.name, code: dept.code, is_active: dept.is_active };

    await dept.update({
      ...dto,
      name:       dto.name?.trim()               ?? dept.name,
      code:       dto.code?.toUpperCase().trim() ?? dept.code,
      updated_by: updatedBy ?? null,
    });

    await logActivity({
      companyId,
      userId:    updatedBy,
      action:    'DEPARTMENT_UPDATED',
      module:    'departments',
      entityId:  id,
      oldValues: before as Record<string, unknown>,
      newValues: { name: dept.name, code: dept.code, is_active: dept.is_active },
    });

    return dept;
  }

  // ─── Soft delete ─────────────────────────────────────────────────────────
  async delete(id: number, companyId: number, deletedBy?: number) {
    const dept = await this.getById(id, companyId);

    // Prevent deletion if employees are assigned
    const empCount = await Employee.count({ where: { department_id: id } });
    if (empCount > 0) {
      throw new AppError(
        `Cannot delete department "${dept.name}" — it has ${empCount} assigned employee(s). Reassign them first.`,
        409,
      );
    }

    await dept.update({ is_active: false, deleted_by: deletedBy ?? null });
    await dept.destroy();

    await logActivity({
      companyId,
      userId:    deletedBy,
      action:    'DEPARTMENT_DELETED',
      module:    'departments',
      entityId:  id,
      oldValues: { name: dept.name },
    });
  }
}
