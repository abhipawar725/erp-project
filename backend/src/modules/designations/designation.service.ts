import { Op, WhereOptions, fn, col } from 'sequelize';
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
  name?:          string;
  grade?:         string | null;
  department_id?: number | null;
  is_active?:     boolean;
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

    if (query.is_active === 'false' || query.is_active === false) {
      where['is_active'] = false;
    } else if (query.is_active === 'all') {
      // no filter
    } else {
      where['is_active'] = true;
    }

    if (query.department_id) {
      where['department_id'] = Number(query.department_id);
    }

    if (query.search) {
      (where as any)[Op.or] = [
        { name:  { [Op.like]: `%${query.search}%` } },
        { grade: { [Op.like]: `%${query.search}%` } },
      ];
    }

    const designations = await Designation.findAll({
      where,
      order: [['name', 'ASC']],
      include: [{
        model:      Department,
        as:         'department',
        attributes: ['id', 'name', 'code'],
        required:   false,
      }],
    });

    // Attach employee count per designation
    const designationIds = designations.map((d) => d.id);
    const empCounts = designationIds.length
      ? await Employee.findAll({
          where: { designation_id: designationIds, status: ['Active', 'On Probation'] },
          attributes: ['designation_id', [fn('COUNT', col('id')), 'count']],
          group: ['designation_id'],
          raw: true,
        })
      : [];

    const countMap = new Map<number, number>(
      (empCounts as any[]).map((r) => [r.designation_id, Number(r.count)]),
    );

    return designations.map((d) => ({
      ...d.toJSON(),
      employee_count: countMap.get(d.id) ?? 0,
    }));
  }

  // ─── Single ────────────────────────────────────────────────────────────────
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
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'status', 'avatar_url', 'department_id'],
          where:      { status: ['Active', 'On Probation'] },
          required:   false,
        },
      ],
    });

    if (!designation) throw new AppError('Designation not found', 404);
    return designation;
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────
  async getStats(companyId: number) {
    const [total, active, withGrade, crossFunctional] = await Promise.all([
      Designation.count({ where: { company_id: companyId } }),
      Designation.count({ where: { company_id: companyId, is_active: true } }),
      Designation.count({ where: { company_id: companyId, is_active: true, grade: { [Op.ne]: null } } }),
      Designation.count({ where: { company_id: companyId, is_active: true, department_id: null } }),
    ]);

    // Most populated designation
    const empCounts = await Employee.findAll({
      where:      { status: ['Active', 'On Probation'] },
      attributes: ['designation_id', [fn('COUNT', col('Employee.id')), 'count']],
      include:    [{
        model:      Designation,
        as:         'designation',
        where:      { company_id: companyId },
        attributes: ['name'],
        required:   true,
      }],
      group:   ['designation_id'],
      order:   [[fn('COUNT', col('Employee.id')), 'DESC']],
      limit:   1,
      raw:     true,
      nest:    true,
    });

    const top = empCounts[0] as any;

    return {
      total,
      active,
      inactive:         total - active,
      withGrade,
      withoutGrade:     active - withGrade,
      crossFunctional,
      deptSpecific:     active - crossFunctional,
      topDesignation:   top ? { id: top.designation_id, name: top['designation.name'], count: Number(top.count) } : null,
    };
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  async create(companyId: number, dto: CreateDesignationDto, createdBy?: number): Promise<Designation> {
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

    // Validate department belongs to company
    if (dto.department_id) {
      const dept = await Department.findOne({ where: { id: dto.department_id, company_id: companyId } });
      if (!dept) throw new AppError('Department not found', 404);
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
      companyId, userId: createdBy,
      action: 'DESIGNATION_CREATED', module: 'designations', entityId: designation.id,
      newValues: { name: designation.name, grade: designation.grade, department_id: designation.department_id },
    });

    return this.getById(designation.id, companyId);
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  async update(id: number, companyId: number, dto: UpdateDesignationDto, updatedBy?: number): Promise<Designation> {
    const designation = await this.findOrFail(id, companyId);

    const before = {
      name:          designation.name,
      grade:         designation.grade,
      department_id: designation.department_id,
      is_active:     designation.is_active,
    };

    if (dto.department_id) {
      const dept = await Department.findOne({ where: { id: dto.department_id, company_id: companyId } });
      if (!dept) throw new AppError('Department not found', 404);
    }

    await designation.update({
      name:          dto.name?.trim()  ?? designation.name,
      grade:         dto.grade !== undefined ? (dto.grade?.trim() || null) : designation.grade,
      department_id: dto.department_id !== undefined ? (dto.department_id || null) : designation.department_id,
      is_active:     dto.is_active     !== undefined ? dto.is_active    : designation.is_active,
      updated_by:    updatedBy         ?? null,
    });

    await logActivity({
      companyId, userId: updatedBy,
      action: 'DESIGNATION_UPDATED', module: 'designations', entityId: id,
      oldValues: before as Record<string, unknown>,
      newValues: { name: designation.name, grade: designation.grade, is_active: designation.is_active },
    });

    return this.getById(id, companyId);
  }

  // ─── Soft delete ───────────────────────────────────────────────────────────
  async delete(id: number, companyId: number, deletedBy?: number): Promise<void> {
    const designation = await this.findOrFail(id, companyId);

    const empCount = await Employee.count({
      where: { designation_id: id, status: ['Active', 'On Probation'] },
    });
    if (empCount > 0) {
      throw new AppError(
        `Cannot delete "${designation.name}" — ${empCount} active employee(s) hold this designation. Reassign them first.`,
        409,
      );
    }

    await designation.update({ is_active: false, updated_by: deletedBy ?? null });
    await designation.destroy();

    await logActivity({
      companyId, userId: deletedBy,
      action: 'DESIGNATION_DELETED', module: 'designations', entityId: id,
      oldValues: { name: designation.name },
    });
  }

  // ─── Toggle active status ──────────────────────────────────────────────────
  async toggleActive(id: number, companyId: number, updatedBy?: number): Promise<Designation> {
    const designation = await this.findOrFail(id, companyId);
    return this.update(id, companyId, { is_active: !designation.is_active }, updatedBy);
  }

  // ─── Private ───────────────────────────────────────────────────────────────
  private async findOrFail(id: number, companyId: number): Promise<Designation> {
    const d = await Designation.findOne({ where: { id, company_id: companyId } });
    if (!d) throw new AppError('Designation not found', 404);
    return d;
  }
}
