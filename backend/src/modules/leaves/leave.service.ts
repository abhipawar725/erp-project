import { Op, WhereOptions } from 'sequelize';
import { LeaveRequest, LeaveType } from '../../database/models/LeaveModels';
import { Employee } from '../../database/models/Employee';
import { AppError } from '../../middleware/errorHandler.middleware';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { logActivity } from '../../utils/activityLogger';

export interface ApplyLeaveDto {
  employee_id: number;
  leave_type_id: number;
  from_date: string;
  to_date: string;
  days: number;
  half_day?: boolean;
  reason?: string;
}

export interface LeaveQueryParams {
  page?: number | string;
  limit?: number | string;
  employee_id?: number | string;
  status?: string;
  leave_type_id?: number | string;
}

export class LeaveService {
  // ─── List all leave requests (company-scoped) ──────────────────────────────
  async getAll(query: LeaveQueryParams, companyId: number) {
    const { page, limit, offset } = parsePaginationParams(query as Record<string, unknown>);

    const where: WhereOptions = {};
    if (query.status)        where['status']        = query.status;
    if (query.employee_id)   where['employee_id']   = Number(query.employee_id);
    if (query.leave_type_id) where['leave_type_id'] = Number(query.leave_type_id);

    const { count, rows } = await LeaveRequest.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        { model: LeaveType, as: 'leaveType', attributes: ['name', 'code', 'is_paid'] },
        {
          model: Employee,
          as: 'employee',
          where: { company_id: companyId },
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'avatar_url'],
        },
      ],
    });

    return { rows, meta: buildPaginationMeta(page, limit, count) };
  }

  // ─── Pending approvals for a manager ──────────────────────────────────────
  async getPendingForManager(managerId: number, companyId: number) {
    return LeaveRequest.findAll({
      where: { status: 'Pending' },
      include: [
        { model: LeaveType, as: 'leaveType', attributes: ['name', 'code'] },
        {
          model: Employee,
          as: 'employee',
          where: { company_id: companyId, reporting_manager_id: managerId },
          attributes: ['id', 'first_name', 'last_name', 'employee_code'],
        },
      ],
      order: [['created_at', 'ASC']],
    });
  }

  // ─── Apply for leave ───────────────────────────────────────────────────────
  async apply(dto: ApplyLeaveDto, companyId: number) {
    // Validate leave type belongs to company
    const leaveType = await LeaveType.findOne({
      where: { id: dto.leave_type_id, company_id: companyId, is_active: true },
    });
    if (!leaveType) throw new AppError('Leave type not found or inactive', 404);

    // Check for overlapping approved/pending leaves
    const overlap = await LeaveRequest.findOne({
      where: {
        employee_id: dto.employee_id,
        status:      { [Op.in]: ['Pending', 'Approved'] },
        [Op.or]: [
          { from_date: { [Op.between]: [dto.from_date, dto.to_date] } },
          { to_date:   { [Op.between]: [dto.from_date, dto.to_date] } },
          {
            from_date: { [Op.lte]: dto.from_date },
            to_date:   { [Op.gte]: dto.to_date },
          },
        ],
      },
    });

    if (overlap) {
      throw new AppError(
        `Leave already exists for overlapping dates (${overlap.from_date} – ${overlap.to_date})`,
        409,
      );
    }

    return LeaveRequest.create({
      employee_id:   dto.employee_id,
      leave_type_id: dto.leave_type_id,
      from_date:     dto.from_date,
      to_date:       dto.to_date,
      days:          dto.days,
      half_day:      dto.half_day ?? false,
      reason:        dto.reason   ?? null,
      status:        'Pending',
    });
  }

  // ─── Approve ───────────────────────────────────────────────────────────────
  async approve(id: number, approvedBy: number, companyId: number) {
    const leave = await this.findByIdScoped(id, companyId);
    if (leave.status !== 'Pending')
      throw new AppError('Only Pending requests can be approved', 400);

    await leave.update({ status: 'Approved', approved_by: approvedBy, approved_at: new Date() });

    await logActivity({
      companyId,
      userId:   approvedBy,
      action:   'LEAVE_APPROVED',
      module:   'leaves',
      entityId: id,
      newValues: { status: 'Approved', approved_by: approvedBy },
    });

    return leave;
  }

  // ─── Reject ────────────────────────────────────────────────────────────────
  async reject(id: number, rejectedBy: number, companyId: number, reason?: string) {
    const leave = await this.findByIdScoped(id, companyId);
    if (leave.status !== 'Pending')
      throw new AppError('Only Pending requests can be rejected', 400);

    await leave.update({ status: 'Rejected', approved_by: rejectedBy, rejection_reason: reason ?? null });

    await logActivity({
      companyId,
      userId:    rejectedBy,
      action:    'LEAVE_REJECTED',
      module:    'leaves',
      entityId:  id,
      newValues: { status: 'Rejected', reason },
    });

    return leave;
  }

  // ─── Cancel (by employee) ──────────────────────────────────────────────────
  async cancel(id: number, employeeId: number, companyId: number) {
    const leave = await this.findByIdScoped(id, companyId);
    if (leave.employee_id !== employeeId)
      throw new AppError('You can only cancel your own leave requests', 403);
    if (!['Pending', 'Approved'].includes(leave.status))
      throw new AppError('Leave cannot be cancelled in its current state', 400);

    await leave.update({ status: 'Cancelled' });
    return leave;
  }

  // ─── Leave types ───────────────────────────────────────────────────────────
  async getLeaveTypes(companyId: number) {
    return LeaveType.findAll({
      where: { company_id: companyId, is_active: true },
      order: [['name', 'ASC']],
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────
  private async findByIdScoped(id: number, companyId: number) {
    const leave = await LeaveRequest.findOne({
      where: { id },
      include: [{
        model: Employee,
        as: 'employee',
        where: { company_id: companyId },
        attributes: ['id'],
      }],
    });
    if (!leave) throw new AppError('Leave request not found', 404);
    return leave;
  }
}
