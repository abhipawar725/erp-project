import { Op, WhereOptions } from 'sequelize';
import { Designation } from '../../database/models/Designation';
import { Department }  from '../../database/models/Department';
import { Employee }    from '../../database/models/Employee';
import { AppError }    from '../../middleware/errorHandler.middleware';
import { logActivity } from '../../utils/activityLogger';

export interface CreateDesignationDto {
  name:          string;
  grade?:        string | null;
  department_id?: number | null;
}

export interface UpdateDesignationDto {
  name?:         string;
  grade?:        string | null;
  department_id?: number | null;
  is_active?:    boolean;
}

export interface DesignationQueryParams {
  department_id?: number | string;
  is_active?:     boolean | string;
  search?:        string;
}

export class DesignationService {

  // ─── List ──────────────────────────────────────────────────────────────────
  async getAll(companyId: number, query: DesignationQueryParams = {}) {
    const where: WhereOptions = { company_id: companyId };

    if (query.is_active !== undefined) {
      where['is_active'] = query.is_active === 'false' ? false : true;
    } else {
      where['is_active'] = true; // default: only active
    }

    if (query.department_id) where['department_id'] = Number(query.department_id);

    if (query.search) {
      (where as any)[Op.or] = [
        { name:  { [Op.like]: `%${query.search}%` } },
        { grade: { [Op.like]: `%${query.search}%` } },
      ];
    }

    return Designation.findAll({
      where,
      order: [['name', 'ASC']],
      include: [{
        model:      Department,
        as:         'department',
        attributes: ['id', 'name', 'code'],
        required:   false,
      }],
    });
  }

  // ─── Single ───────────────────────────────────────────────────────────────
  async getById(id: number, companyId: number) {
    const designation = await Designation.findOne({
      where: { id, company_id: companyId },
      include: [
        {
          model:      Department,
          as:         'department',
          attributes: ['id', 'name', 'code'],
          required:   false,
        },
        {
          model:      Employee,
          as:         'employees',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'status'],
          where:      { status: 'Active' },
          required:   false,
        },
      ],
    });

    if (!designation) throw new AppError('Designation not found', 404);
    return designation;
  }

  // ─── Create ───────────────────────────────────────────────────────────────
  async create(
    companyId:  number,
    dto:        CreateDesignationDto,
    createdBy?: number,
  ): Promise<Designation> {
    // Duplicate check within same company + department
    const existing = await Designation.findOne({
      where: {
        company_id:    companyId,
        name:          dto.name.trim(),
        department_id: dto.department_id ?? null,
        is_active:     true,
      },
    });

    if (existing) {
      throw new AppError(
        `Designation "${dto.name}" already exists${dto.department_id ? ' in this department' : ''}`,
        409,
      );
    }

    const designation = await Designation.create({
      company_id:    companyId,
      name:          dto.name.trim(),
      grade:         dto.grade?.trim() || null,
      department_id: dto.department_id || null,
      is_active:     true,
      created_by:    createdBy ?? null,
    });

    await logActivity({
      companyId,
      userId:    createdBy,
      action:    'DESIGNATION_CREATED',
      module:    'designations',
      entityId:  designation.id,
      newValues: { name: designation.name, grade: designation.grade, department_id: designation.department_id },
    });

    return designation;
  }

  // ─── Update ───────────────────────────────────────────────────────────────
  async update(
    id:        number,
    companyId: number,
    dto:       UpdateDesignationDto,
    updatedBy?: number,
  ): Promise<Designation> {
    const designation = await this.findOrFail(id, companyId);

    const before = {
      name:          designation.name,
      grade:         designation.grade,
      department_id: designation.department_id,
      is_active:     designation.is_active,
    };

    await designation.update({
      name:          dto.name?.trim()          ?? designation.name,
      grade:         dto.grade?.trim()         ?? designation.grade,
      department_id: dto.department_id         !== undefined ? dto.department_id : designation.department_id,
      is_active:     dto.is_active             !== undefined ? dto.is_active    : designation.is_active,
      updated_by:    updatedBy                 ?? null,
    });

    await logActivity({
      companyId,
      userId:    updatedBy,
      action:    'DESIGNATION_UPDATED',
      module:    'designations',
      entityId:  id,
      oldValues: before as Record<string, unknown>,
      newValues: { name: designation.name, grade: designation.grade },
    });

    return designation;
  }

  // ─── Soft delete ──────────────────────────────────────────────────────────
  async delete(id: number, companyId: number, deletedBy?: number): Promise<void> {
    const designation = await this.findOrFail(id, companyId);

    // Guard: cannot delete if active employees are assigned
    const empCount = await Employee.count({
      where: { designation_id: id, status: ['Active', 'On_Probation'] },
    });

    if (empCount > 0) {
      throw new AppError(
        `Cannot delete "${designation.name}" — ${empCount} active employee(s) hold this designation. Reassign them first.`,
        409,
      );
    }

    await designation.update({ is_active: false, updated_by: deletedBy ?? null });
    await designation.destroy(); // paranoid soft delete

    await logActivity({
      companyId,
      userId:    deletedBy,
      action:    'DESIGNATION_DELETED',
      module:    'designations',
      entityId:  id,
      oldValues: { name: designation.name },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────
  private async findOrFail(id: number, companyId: number): Promise<Designation> {
    const d = await Designation.findOne({ where: { id, company_id: companyId } });
    if (!d) throw new AppError('Designation not found', 404);
    return d;
  }
}
