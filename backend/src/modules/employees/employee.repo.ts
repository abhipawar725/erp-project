/**
 * employees.repository.ts — CORRECTED
 *
 * KEY CHANGE: Manager lookup uses employee_id (integer) not employee_code.
 * All FK references are integers throughout.
 */

import { Op, Transaction, WhereOptions } from 'sequelize';
import {
  Employee, EmployeeCommitmentProbation, EmployeeSchemes, EmployeePersonal,
  EmployeeFamily, EmployeeAddress, EmployeeEmergencyContact, EmployeeStatutory,
  EmployeeBankDetail, EmployeeSalary, EmployeeAssetDeduction, EmployeeExperience,
  EmployeeEducation, EmployeeOnboardingDocs, EmployeeTransfer, EmployeeExit, EmployeeDraft,
} from '../../database/models/Employee';
import type { EmployeeQueryParams } from './employee.types';

// ─── Includes ────────────────────────────────────────────────────────────────
const MGR_ATTRS = ['id', 'employee_code', 'first_name', 'last_name', 'official_email'];

const DETAIL_INCLUDES: any[] = [
  { association: 'l1Manager', attributes: MGR_ATTRS },
  { association: 'l2Manager', attributes: MGR_ATTRS },
  { association: 'commitmentProbation' },
  { association: 'schemes' },
  { association: 'personal' },
  { association: 'family' },
  { association: 'addresses', order: [['address_type', 'ASC']] },
  { association: 'emergencyContacts' },
  { association: 'experience' },
  { association: 'education' },
  { association: 'onboardingDocs' },
  { association: 'assetDeduction' },
  { association: 'transfers', order: [['transfer_order', 'ASC']] },
  { association: 'exit' },
];

const SENSITIVE_INCLUDES: any[] = [
  { association: 'statutory' },
  { association: 'bankDetails' },
  { association: 'salaries' },
];

const LIST_INCLUDES: any[] = [
  { association: 'l1Manager', attributes: MGR_ATTRS },
];

// Columns to always exclude from API responses
const ALWAYS_EXCLUDE = [
  'otp_hash', 'otp_expires', 'otp_attempts', 'otp_locked_until',
  'refresh_token', 'refresh_expires', 'must_change_password',
];

export class EmployeeRepository {

  // ─── List ──────────────────────────────────────────────────────────────────
  async findAll(params: EmployeeQueryParams, companyId: number) {
    const page   = Math.max(1, Number(params.page) || 1);
    const limit  = Math.min(100, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const where: WhereOptions = { company_id: companyId };
    if (params.status)          (where as any).status          = params.status;
    if (params.employment_type) (where as any).employment_type = params.employment_type;
    if (params.department_id)   (where as any).department_id   = Number(params.department_id);
    if (params.designation_id)  (where as any).designation_id  = Number(params.designation_id);

    if (params.search) {
      const s = `%${params.search.trim()}%`;
      (where as any)[Op.or] = [
        { first_name:    { [Op.like]: s } },
        { last_name:     { [Op.like]: s } },
        { middle_name:   { [Op.like]: s } },
        { employee_code: { [Op.like]: s } },
        { official_email:{ [Op.like]: s } },
        { working_city:  { [Op.like]: s } },
      ];
    }

    const VALID_SORT = ['created_at', 'first_name', 'last_name', 'employee_code', 'actual_doj'];
    const sort  = VALID_SORT.includes(String(params.sort)) ? String(params.sort) : 'created_at';
    const order = params.order === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Employee.findAndCountAll({
      where,
      include: LIST_INCLUDES,
      attributes: { exclude: ALWAYS_EXCLUDE },
      limit, offset,
      order: [[sort, order]],
      distinct: true,
    });

    return { rows, meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
  }

  // ─── By ID ──────────────────────────────────────────────────────────────────
  async findById(id: number, companyId: number, includeSensitive = false): Promise<Employee | null> {
    return Employee.findOne({
      where: { id, company_id: companyId },
      include: includeSensitive ? [...DETAIL_INCLUDES, ...SENSITIVE_INCLUDES] : DETAIL_INCLUDES,
      attributes: { exclude: ALWAYS_EXCLUDE },
    });
  }

  // ─── Create ─────────────────────────────────────────────────────────────────
  async create(data: object, t: Transaction): Promise<Employee> {
    return Employee.create(data as any, { transaction: t });
  }

  // ─── Update employees row ──────────────────────────────────────────────────
  async update(id: number, companyId: number, data: object, t: Transaction) {
    return Employee.update(data as any, { where: { id, company_id: companyId }, transaction: t });
  }

  // ─── Soft delete ─────────────────────────────────────────────────────────────
  async softDelete(id: number, companyId: number, deletedBy: number): Promise<Employee | null> {
    const emp = await Employee.findOne({ where: { id, company_id: companyId } });
    if (!emp) return null;
    await emp.update({ deleted_by: deletedBy, portal_access: false });
    await emp.destroy();
    return emp;
  }

  // ─── Upsert child tables ──────────────────────────────────────────────────
  async upsertCommitmentProbation(employeeId: number, data: object, t: Transaction) {
    const [r] = await EmployeeCommitmentProbation.upsert({ employee_id: employeeId, ...data }, { transaction: t });
    return r;
  }
  async upsertSchemes(employeeId: number, data: object, t: Transaction) {
    const [r] = await EmployeeSchemes.upsert({ employee_id: employeeId, ...data }, { transaction: t });
    return r;
  }
  async upsertPersonal(employeeId: number, data: object, t: Transaction) {
    const [r] = await EmployeePersonal.upsert({ employee_id: employeeId, ...data }, { transaction: t });
    return r;
  }
  async upsertFamily(employeeId: number, data: object, t: Transaction) {
    const [r] = await EmployeeFamily.upsert({ employee_id: employeeId, ...data }, { transaction: t });
    return r;
  }
  async upsertStatutory(employeeId: number, data: object, t: Transaction) {
    const [r] = await EmployeeStatutory.upsert({ employee_id: employeeId, ...data }, { transaction: t });
    return r;
  }
  async upsertExperience(employeeId: number, data: object, t: Transaction) {
    const [r] = await EmployeeExperience.upsert({ employee_id: employeeId, ...data }, { transaction: t });
    return r;
  }
  async upsertEducation(employeeId: number, data: object, t: Transaction) {
    const [r] = await EmployeeEducation.upsert({ employee_id: employeeId, ...data }, { transaction: t });
    return r;
  }
  async upsertAssetDeduction(employeeId: number, data: object, t: Transaction) {
    const [r] = await EmployeeAssetDeduction.upsert({ employee_id: employeeId, ...data }, { transaction: t });
    return r;
  }
  async upsertOnboardingDocs(employeeId: number, data: object, t: Transaction) {
    const [r] = await EmployeeOnboardingDocs.upsert({ employee_id: employeeId, ...data }, { transaction: t });
    return r;
  }
  async upsertExit(employeeId: number, data: object, t: Transaction) {
    const [r] = await EmployeeExit.upsert({ employee_id: employeeId, ...data }, { transaction: t });
    return r;
  }

  // ─── Address: upsert by type ───────────────────────────────────────────────
  async upsertAddress(employeeId: number, type: 'present' | 'permanent', data: object, t: Transaction) {
    const existing = await EmployeeAddress.findOne({ where: { employee_id: employeeId, address_type: type } });
    if (existing) return existing.update(data as any, { transaction: t });
    return EmployeeAddress.create({ employee_id: employeeId, address_type: type, ...data } as any, { transaction: t });
  }

  // ─── Emergency: upsert single primary ────────────────────────────────────
  async upsertEmergencyContact(employeeId: number, data: object, t: Transaction) {
    const existing = await EmployeeEmergencyContact.findOne({ where: { employee_id: employeeId, is_primary: true } });
    if (existing) return existing.update(data as any, { transaction: t });
    return EmployeeEmergencyContact.create({ employee_id: employeeId, ...data } as any, { transaction: t });
  }

  // ─── Bank: upsert by type ────────────────────────────────────────────────
  async upsertBank(employeeId: number, bankType: 'personal' | 'official', data: object, t: Transaction) {
    const existing = await EmployeeBankDetail.findOne({ where: { employee_id: employeeId, bank_type: bankType } });
    if (existing) return existing.update(data as any, { transaction: t });
    return EmployeeBankDetail.create({ employee_id: employeeId, bank_type: bankType, ...data } as any, { transaction: t });
  }

  // ─── Salary: upsert by type ───────────────────────────────────────────────
  async upsertSalary(employeeId: number, salaryType: 'current' | 'joining', data: object, t: Transaction) {
    const existing = await EmployeeSalary.findOne({ where: { employee_id: employeeId, salary_type: salaryType } });
    if (existing) return existing.update(data as any, { transaction: t });
    return EmployeeSalary.create({ employee_id: employeeId, salary_type: salaryType, ...data } as any, { transaction: t });
  }

  // ─── Transfers: full replace ───────────────────────────────────────────────
  async replaceTransfers(employeeId: number, transfers: object[], t: Transaction) {
    await EmployeeTransfer.destroy({ where: { employee_id: employeeId }, transaction: t });
    if (!transfers.length) return [];
    return EmployeeTransfer.bulkCreate(
      transfers.map((tr, i) => ({ employee_id: employeeId, transfer_order: i + 1, ...tr })) as any,
      { transaction: t }
    );
  }

  // ─── Completion % ─────────────────────────────────────────────────────────
  async updateCompletionPct(id: number, pct: number, t: Transaction) {
    return Employee.update({ form_completion_pct: pct }, { where: { id }, transaction: t });
  }

  // ─── Lookups ────────────────────────────────────────────────────────────────

  // Find by employee_code for duplicate check only
  async findByCode(code: string, companyId: number, excludeId?: number) {
    return Employee.findOne({
      where: { company_id: companyId, employee_code: code, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}) },
    });
  }

  // Find manager by employee_id (integer) — used in reporting step
  async findManagerById(managerId: number, companyId: number) {
    return Employee.findOne({
      where: { id: managerId, company_id: companyId, status: 'Active', portal_access: true },
      attributes: ['id', 'employee_code', 'first_name', 'last_name', 'official_email'],
    });
  }

  // Search managers by name or code (for async dropdown)
  async searchManagers(query: string, companyId: number, excludeId?: number) {
    const s = `%${query}%`;
    return Employee.findAll({
      where: {
        company_id: companyId,
        status: 'Active',
        ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
        [Op.or]: [
          { first_name:    { [Op.like]: s } },
          { last_name:     { [Op.like]: s } },
          { employee_code: { [Op.like]: s } },
        ],
      },
      attributes: ['id', 'employee_code', 'first_name', 'last_name', 'official_email'],
      limit: 20,
    });
  }

  // ─── Draft ────────────────────────────────────────────────────────────────
  async upsertDraft(data: { employeeId?: number | null; createdBy: number; step: string; formData: object; sessionId: string }) {
    const [draft] = await EmployeeDraft.upsert({
      employee_id: data.employeeId ?? null,
      created_by:  data.createdBy,
      step:        data.step,
      form_data:   data.formData,
      session_id:  data.sessionId,
      expires_at:  new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return draft;
  }

  async getDraft(sessionId: string, createdBy: number) {
    return EmployeeDraft.findOne({
      where: { session_id: sessionId, created_by: createdBy, expires_at: { [Op.gt]: new Date() } },
    });
  }

  async deleteDraft(sessionId: string, createdBy: number) {
    return EmployeeDraft.destroy({ where: { session_id: sessionId, created_by: createdBy } });
  }

  // ─── Auth helpers (used by auth service) ─────────────────────────────────
  async findForLogin(emailOrMobile: string, companyId: number) {
    const isPhone = /^\+?[0-9]{7,15}$/.test(emailOrMobile.replace(/\s/g, ''));
    return Employee.findOne({
      where: {
        company_id: companyId,
        portal_access: true,
        [Op.or]: isPhone
          ? [{ phone: emailOrMobile }]
          : [{ email: emailOrMobile.toLowerCase() }],
      },
    });
  }

  async updateAuthFields(id: number, data: Partial<{
    otp_hash: string | null; otp_expires: Date | null; otp_attempts: number;
    otp_locked_until: Date | null; refresh_token: string | null;
    refresh_expires: Date | null; last_login_at: Date;
    portal_access: boolean; must_change_password: boolean;
  }>) {
    return Employee.update(data as any, { where: { id } });
  }

  // ─── Stats ────────────────────────────────────────────────────────────────
  async getSummary(companyId: number) {
    const [active, left, retired, total] = await Promise.all([
      Employee.count({ where: { company_id: companyId, status: 'Active' } }),
      Employee.count({ where: { company_id: companyId, status: 'Left' } }),
      Employee.count({ where: { company_id: companyId, status: 'Retired' } }),
      Employee.count({ where: { company_id: companyId } }),
    ]);
    return { active, left, retired, total };
  }
}

export const employeeRepository = new EmployeeRepository();