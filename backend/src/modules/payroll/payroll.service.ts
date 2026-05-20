import { PayrollRun, Payslip } from '../../database/models/PayrollModels';
import { Employee } from '../../database/models/Employee';
import { AppError } from '../../middleware/errorHandler.middleware';
import { logActivity } from '../../utils/activityLogger';

export class PayrollService {
  // ─── All runs for a company ────────────────────────────────────────────────
  async getRuns(companyId: number) {
    return PayrollRun.findAll({
      where: { company_id: companyId },
      order: [['year', 'DESC'], ['month', 'DESC']],
    });
  }

  // ─── Single run ───────────────────────────────────────────────────────────
  async getRunById(id: number, companyId: number) {
    const run = await PayrollRun.findOne({ where: { id, company_id: companyId } });
    if (!run) throw new AppError('Payroll run not found', 404);
    return run;
  }

  // ─── Create draft ─────────────────────────────────────────────────────────
  async createRun(companyId: number, month: number, year: number, actorId?: number) {
    const existing = await PayrollRun.findOne({ where: { company_id: companyId, month, year } });
    if (existing) throw new AppError(`Payroll run for ${month}/${year} already exists`, 409);

    const run = await PayrollRun.create({ company_id: companyId, month, year, status: 'Draft' });

    await logActivity({
      companyId,
      userId:    actorId,
      action:    'PAYROLL_RUN_CREATED',
      module:    'payroll',
      entityId:  run.id,
      newValues: { month, year, status: 'Draft' },
    });

    return run;
  }

  // ─── Submit for approval ───────────────────────────────────────────────────
  async submitRun(id: number, companyId: number, actorId?: number) {
    const run = await this.getRunById(id, companyId);
    if (run.status !== 'Draft' && run.status !== 'Processing')
      throw new AppError(`Run must be Draft or Processing to submit (current: ${run.status})`, 400);

    await run.update({ status: 'Pending Approval' });

    await logActivity({ companyId, userId: actorId, action: 'PAYROLL_SUBMITTED', module: 'payroll', entityId: id });
    return run;
  }

  // ─── Approve ───────────────────────────────────────────────────────────────
  async approveRun(id: number, companyId: number, approvedBy: number) {
    const run = await this.getRunById(id, companyId);
    if (run.status !== 'Pending Approval')
      throw new AppError(`Run must be in Pending Approval state (current: ${run.status})`, 400);

    await run.update({ status: 'Approved', approved_by: approvedBy, approved_at: new Date() });

    await logActivity({
      companyId,
      userId:    approvedBy,
      action:    'PAYROLL_APPROVED',
      module:    'payroll',
      entityId:  id,
      newValues: { status: 'Approved', approved_by: approvedBy },
    });

    return run;
  }

  // ─── Disburse ──────────────────────────────────────────────────────────────
  async disburseRun(id: number, companyId: number, actorId?: number) {
    const run = await this.getRunById(id, companyId);
    if (run.status !== 'Approved')
      throw new AppError(`Run must be Approved before disbursement (current: ${run.status})`, 400);

    await run.update({ status: 'Disbursed', disbursed_at: new Date() });

    await logActivity({ companyId, userId: actorId, action: 'PAYROLL_DISBURSED', module: 'payroll', entityId: id });
    return run;
  }

  // ─── Payslips for an employee ──────────────────────────────────────────────
  async getPayslips(employeeId: number, companyId: number) {
    // Verify employee belongs to company
    const emp = await Employee.findOne({ where: { id: employeeId, company_id: companyId } });
    if (!emp) throw new AppError('Employee not found', 404);

    return Payslip.findAll({
      where: { employee_id: employeeId },
      include: [{ model: PayrollRun, as: 'payrollRun', attributes: ['month', 'year', 'status'] }],
      order: [[{ model: PayrollRun, as: 'payrollRun' }, 'year', 'DESC'],
              [{ model: PayrollRun, as: 'payrollRun' }, 'month', 'DESC']],
    });
  }

  // ─── Single payslip ────────────────────────────────────────────────────────
  async getPayslipById(id: number, companyId: number) {
    const payslip = await Payslip.findByPk(id, {
      include: [
        { model: PayrollRun, as: 'payrollRun', where: { company_id: companyId }, attributes: ['month', 'year', 'status'] },
        { model: Employee, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation_id'] },
      ],
    });
    if (!payslip) throw new AppError('Payslip not found', 404);
    return payslip;
  }
}
