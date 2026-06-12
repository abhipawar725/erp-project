/**
 * employees.helper.ts
 * Business calculations sourced directly from spreadsheet formulas.
 * Salary calculator (rows 3-10), duration computations (rows 43-45),
 * RD maturity (rows 85-87), asset deduction last installment (rows 213-215).
 */

import { AMDB_PERCENTAGE, STEP_WEIGHTS, WIZARD_STEPS } from './employee.constants';
import type { StepKey } from './employee.constants';
import { Employee } from '../../database/models/Employee';
import { Op } from 'sequelize';

// ─── Salary computations (spreadsheet salary calculator) ─────────────────────

export interface SalaryBreakdown {
  basic:           number;
  hra:             number;
  allowance1:      number;
  gross_salary_pm: number;
  amdb_pm:         number;
  total_earning_pm: number;
}

/**
 * Computes gross and total as spreadsheet does:
 *   Gross = Basic + HRA + Allowance1
 *   AMDB  = Gross * AMDB_PERCENTAGE (0.30)   — if amdb not provided
 *   Total = Gross + AMDB
 */
export function computeSalary(
  basic: number,
  hra: number,
  allowance1: number,
  amdb?: number,
): SalaryBreakdown {
  const b = Number(basic) || 0;
  const h = Number(hra) || 0;
  const a = Number(allowance1) || 0;
  const gross = b + h + a;
  const amdb_pm = amdb !== undefined ? Number(amdb) : Math.round(gross * AMDB_PERCENTAGE);
  return {
    basic:            b,
    hra:              h,
    allowance1:       a,
    gross_salary_pm:  gross,
    amdb_pm,
    total_earning_pm: gross + amdb_pm,
  };
}

// ─── Duration computation (spreadsheet rows 43-45) ───────────────────────────

export function computeWorkingDuration(doj: Date | string): string {
  const start = new Date(doj);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const totalDays = Math.floor(diffMs / 86400000);
  const years  = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days   = totalDays % 30;
  const parts: string[] = [];
  if (years  > 0) parts.push(`${years} Yr${years  > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} Mo${months > 1 ? 's' : ''}`);
  if (days   > 0) parts.push(`${days} Day${days > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(' ') : '0 Days';
}

// ─── Commitment end date ──────────────────────────────────────────────────────

export function computeCommitmentEndDate(enteredOn: string, termStr: string): Date | null {
  if (!enteredOn || termStr === 'N/A') return null;
  const months = parseInt(termStr); // '36 Months' → 36
  if (isNaN(months)) return null;
  const d = new Date(enteredOn);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ─── Probation end date ───────────────────────────────────────────────────────

export function computeProbationEndDate(doj: string, periodStr: string): Date | null {
  if (!doj || !periodStr) return null;
  const months = parseInt(periodStr);
  if (isNaN(months)) return null;
  const d = new Date(doj);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ─── RD maturity (rows 85-87) ─────────────────────────────────────────────────

export function computeRdMaturity(
  openingDate: string,
  termStr: string,
  monthlyEmp: number,
  monthlyEmpContrib: number,
): { maturityDate: Date | null; maturityAmount: number } {
  if (!openingDate || termStr === 'N/A') return { maturityDate: null, maturityAmount: 0 };
  const months = parseInt(termStr);
  if (isNaN(months)) return { maturityDate: null, maturityAmount: 0 };

  const d = new Date(openingDate);
  d.setMonth(d.getMonth() + months);

  const totalMonthly = (Number(monthlyEmp) || 0) + (Number(monthlyEmpContrib) || 0);
  const maturityAmount = totalMonthly * months; // simple accumulation (no interest in sheet)
  return { maturityDate: d, maturityAmount };
}

// ─── Asset deduction calculations (rows 213-215) ──────────────────────────────

export function computeAssetDeduction(
  securityAmount: number,
  deductionMonthsStr: string,
  monthlyDeduction?: number,
): { monthlyDeduction: number; lastInstallment: number } {
  if (!securityAmount || deductionMonthsStr === 'N/A') {
    return { monthlyDeduction: 0, lastInstallment: 0 };
  }
  const months = parseInt(deductionMonthsStr);
  if (isNaN(months) || months <= 0) return { monthlyDeduction: 0, lastInstallment: 0 };

  const md = monthlyDeduction ?? Math.floor(securityAmount / months);
  const totalWithoutLast = md * (months - 1);
  const last = securityAmount - totalWithoutLast;
  return { monthlyDeduction: md, lastInstallment: last };
}

// ─── ESIC / PF contribution computations ─────────────────────────────────────

export function computePfContributions(basicSalary: number, pctOfBasic: number) {
  const empContrib = Math.round(basicSalary * (pctOfBasic / 100));
  const employerContrib1 = empContrib; // typically matched
  const employerContrib2 = 0;         // EPS / admin charges (simplified)
  return { empContrib, employerContrib1, employerContrib2 };
}

export function computeEsicContributions(grossSalary: number) {
  const ESIC_THRESHOLD = 21000;
  if (grossSalary > ESIC_THRESHOLD) {
    return { empContrib: 0, employerContrib: 0 };
  }
  const empContrib       = Math.round(grossSalary * 0.0075);
  const employerContrib  = Math.round(grossSalary * 0.0325);
  return { empContrib, employerContrib };
}

// ─── Employee code generation ─────────────────────────────────────────────────

export async function generateEmployeeCode(companyId: number): Promise<string> {
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

export async function generateReferenceCode(companyId: number): Promise<string> {
  const last = await Employee.findOne({
    where: { company_id: companyId, reference_code: { [Op.ne]: null } },
    order: [['id', 'DESC']],
    attributes: ['reference_code'],
    paranoid: false,
  });
  if (!last?.reference_code) return 'REF-0001';
  const match = last.reference_code.match(/(\d+)$/);
  const num = match ? parseInt(match[1], 10) + 1 : 1;
  return `REF-${String(num).padStart(4, '0')}`;
}

// ─── Form completion percentage ───────────────────────────────────────────────

export function computeCompletionPct(employee: any): number {
  let score = 0;
  const checks: Record<StepKey, () => boolean> = {
    basic:          () => !!(employee.first_name && employee.last_name && employee.employee_code && employee.employment_type),
    employment:     () => !!(employee.department_id && employee.designation_id && employee.working_city && employee.actual_doj),
    reporting:      () => !!(employee.l1_manager_id && employee.official_mobile),
    commitment:     () => employee.commitmentProbation != null,
    schemes:        () => employee.schemes != null,
    personal:       () => !!(employee.personal?.date_of_birth && employee.personal?.gender && employee.personal?.blood_group),
    address:        () => !!(employee.addresses?.find((a: any) => a.address_type === 'present')),
    family:         () => !!(employee.family?.father_name && employee.family?.mother_name),
    emergency:      () => !!(employee.emergencyContacts?.[0]?.contact_name),
    statutory:      () => !!(employee.statutory?.aadhaar_number && employee.statutory?.pan_number),
    bank:           () => !!(employee.bankDetails?.find((b: any) => b.bank_type === 'personal')),
    experience:     () => employee.experience != null,
    salary:         () => !!(employee.salaries?.find((s: any) => s.salary_type === 'current')),
    onboarding_docs:() => employee.onboardingDocs != null,
    review:         () => false,
  };

  for (const step of WIZARD_STEPS) {
    if (step.key === 'review') continue;
    const fn = checks[step.key as StepKey];
    if (fn && fn()) score += STEP_WEIGHTS[step.key as StepKey];
  }

  return Math.min(100, Math.round(score));
}

// ─── Date format conversion: DD-MM-YYYY → YYYY-MM-DD ─────────────────────────
// Spreadsheet uses DD-MM-YYYY (cell B43 has custom date validation for this)

export function parseDdMmYyyy(val: string): Date | null {
  if (!val) return null;
  // Handle both DD-MM-YYYY and YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val);
  const parts = val.split(/[-\/]/);
  if (parts.length === 3 && parts[0].length === 2) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(val);
}