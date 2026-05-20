import { Op, WhereOptions, literal } from 'sequelize';
import { Employee } from '../../database/models/Employee';
import { Department } from '../../database/models/Department';
import { Designation } from '../../database/models/Designation';
import { AppError } from '../../middleware/errorHandler.middleware';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { logActivity } from '../../utils/activityLogger';
import type {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryParams,
  SensitiveField,
  SENSITIVE_FIELDS,
} from './employee.types';

// Fields excluded from list view for performance
const LIST_EXCLUDE_FIELDS = [
  'aadhaar_number', 'pan_number', 'passport_number',
  'uan_number', 'pf_number', 'esi_number',
  'bank_name', 'bank_account_number', 'ifsc_code',
  'address_line1', 'address_line2',
];

// Sensitive fields excluded unless user has permission
const SENSITIVE_EXCLUDE = [
  'aadhaar_number', 'pan_number', 'passport_number',
  'uan_number', 'pf_number', 'esi_number',
  'bank_name', 'bank_account_number', 'ifsc_code',
];

export class EmployeeService {

  // ─────────────────────────────────────────────────────────────
  // List employees (paginated, filtered, searched)
  // ─────────────────────────────────────────────────────────────
  async findAll(query: EmployeeQueryParams, companyId: number, canViewSensitive = false) {
    const { page, limit, offset } = parsePaginationParams(query as any);

    const where: WhereOptions = { company_id: companyId };

    // Full-text search across name, email, code
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      (where as any)[Op.or] = [
        { first_name: { [Op.like]: s } },
        { last_name: { [Op.like]: s } },
        { email: { [Op.like]: s } },
        { employee_code: { [Op.like]: s } },
      ];
    }

    

    // Filters
    if (query.department_id) where['department_id'] = Number(query.department_id);
    if (query.designation_id) where['designation_id'] = Number(query.designation_id);
    if (query.status) where['status'] = query.status;
    if (query.employment_type) where['employment_type'] = query.employment_type;
    if (query.work_location) where['work_location'] = query.work_location;

    const sortField = query.sort || 'created_at';
    const sortOrder = query.order || 'DESC';

    const { count, rows } = await Employee.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortField, sortOrder]],
      attributes: { exclude: LIST_EXCLUDE_FIELDS },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'], required: false },
        { model: Designation, as: 'designation', attributes: ['id', 'name', 'grade'], required: false },
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'avatar_url'],
          required: false,
        },
      ],
    });

    return { rows, meta: buildPaginationMeta(page, limit, count) };
  }

  // ─────────────────────────────────────────────────────────────
  // Find one by ID
  // ─────────────────────────────────────────────────────────────
  async findById(id: number, companyId: number, canViewSensitive = false) {
    const excludeFields = canViewSensitive ? [] : SENSITIVE_EXCLUDE;

    const employee = await Employee.findOne({
      where: { id, company_id: companyId },
      attributes: { exclude: excludeFields },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'], required: false },
        { model: Designation, as: 'designation', attributes: ['id', 'name', 'grade'], required: false },
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'avatar_url'],
          required: false,
        },
      ],
    });

    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
  }

  // ─────────────────────────────────────────────────────────────
  // Create employee (full onboarding flow)
  // ─────────────────────────────────────────────────────────────
  async create(dto: CreateEmployeeDto, actorId?: number, ipAddress?: string): Promise<Employee> {
    // Duplicate check: employee_code and email must be unique per company
    const existing = await Employee.findOne({
      where: {
        company_id: dto.company_id,
        [Op.or]: [
          { employee_code: dto.employee_code.trim() },
          { email: dto.email.toLowerCase().trim() },
        ],
      },
    });

    if (existing) {
      const conflict = existing.employee_code === dto.employee_code
        ? `Employee code "${dto.employee_code}" already exists`
        : `Email "${dto.email}" is already registered`;
      throw new AppError(conflict, 409);
    }

    const employee = await Employee.create({
      ...dto,
      employee_code: dto.employee_code.trim(),
      email: dto.email.toLowerCase().trim(),
      first_name: dto.first_name.trim(),
      last_name: dto.last_name.trim(),
      nationality: dto.nationality || 'Indian',
      created_by: actorId ?? null,
    } as any);

    await logActivity({
      companyId: dto.company_id,
      userId: actorId,
      action: 'EMPLOYEE_CREATED',
      module: 'employees',
      entityId: employee.id,
      newValues: {
        employee_code: employee.employee_code,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
      },
      ipAddress,
    });

    return employee;
  }

  // ─────────────────────────────────────────────────────────────
  // Update employee (partial — used for each step separately too)
  // ─────────────────────────────────────────────────────────────
  async update(
  id: number,
  companyId: number,
  dto: UpdateEmployeeDto,
  actorId?: number,
  ipAddress?: string,
): Promise<Employee> {
  const employee = await this.findById(id, companyId, true);

  // Prepare update payload
  const updateData: Partial<Employee> & {
    updated_by?: number;
  } = {
    updated_by: actorId,
  };

  // Convert DTO values safely
  Object.entries(dto).forEach(([key, value]) => {
    if (value === undefined) return;

    // Handle date fields
    const dateFields = [
      'date_of_birth',
      'joining_date',
      'confirmation_date',
      'resignation_date',
      'last_working_date',
    ];

    if (dateFields.includes(key)) {
      (updateData as any)[key] = value ? new Date(value as string) : null;
    } else {
      (updateData as any)[key] = value;
    }
  });

  // Capture audit logs only for changed values
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  Object.keys(updateData).forEach((key) => {
    if (key === 'updated_by') return;

    const oldVal = (employee as any)[key];
    const newVal = (updateData as any)[key];

    // Handle Date comparison properly
    const oldComparable =
      oldVal instanceof Date ? oldVal.toISOString() : oldVal;

    const newComparable =
      newVal instanceof Date ? newVal.toISOString() : newVal;

    if (oldComparable !== newComparable) {
      oldValues[key] = oldVal;
      newValues[key] = newVal;
    }
  });

  // Update only if changes exist
  if (Object.keys(newValues).length > 0) {
    await employee.update(updateData);

    await logActivity({
      companyId,
      userId: actorId,
      action: 'EMPLOYEE_UPDATED',
      module: 'employees',
      entityId: id,
      oldValues,
      newValues,
      ipAddress,
    });
  }

  return this.findById(id, companyId, true);
}

  // ─────────────────────────────────────────────────────────────
  // Patch a single step (used by wizard partial-save)
  // ─────────────────────────────────────────────────────────────
  async patchStep(
    id: number,
    companyId: number,
    step: 'basic' | 'employment' | 'address' | 'statutory' | 'bank',
    dto: Partial<UpdateEmployeeDto>,
    actorId?: number,
  ): Promise<Employee> {
    return this.update(id, companyId, dto as UpdateEmployeeDto, actorId);
  }

  // ─────────────────────────────────────────────────────────────
  // Soft delete
  // ─────────────────────────────────────────────────────────────
  async delete(id: number, companyId: number, actorId?: number): Promise<void> {
    const employee = await this.findById(id, companyId, false);
    await employee.update({ deleted_by: actorId });
    await employee.destroy(); // paranoid soft delete

    await logActivity({
      companyId,
      userId: actorId,
      action: 'EMPLOYEE_DELETED',
      module: 'employees',
      entityId: id,
      oldValues: { employee_code: employee.employee_code, email: employee.email },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Upload avatar — updates avatar_url field
  // ─────────────────────────────────────────────────────────────
  async updateAvatar(id: number, companyId: number, avatarUrl: string, actorId?: number): Promise<Employee> {
    const employee = await this.findById(id, companyId, false);
    await employee.update({ avatar_url: avatarUrl, updated_by: actorId });
    return employee;
  }

  // ─────────────────────────────────────────────────────────────
  // Auto-generate next employee code
  // ─────────────────────────────────────────────────────────────
  async generateNextCode(companyId: number): Promise<string> {
    const last = await Employee.findOne({
      where: { company_id: companyId },
      order: [['id', 'DESC']],
      attributes: ['employee_code'],
      paranoid: false,
    });

    if (!last) return 'EMP-0001';

    const match = last.employee_code.match(/(\d+)$/);
    const num = match ? parseInt(match[1], 10) + 1 : 1;
    return `EMP-${String(num).padStart(4, '0')}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Dashboard summary
  // ─────────────────────────────────────────────────────────────
  async getSummary(companyId: number) {
    const [total, active, onProbation, left] = await Promise.all([
      Employee.count({ where: { company_id: companyId } }),
      Employee.count({ where: { company_id: companyId, status: 'Active' } }),
      Employee.count({ where: { company_id: companyId, status: 'On_Probation' } }),
      Employee.count({ where: { company_id: companyId, status: 'Left' } }),
    ]);

    return { total, active, onProbation, left, absconding: total - active - onProbation - left };
  }
}
