import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── Payroll Run ───────────────────────────────────────────────

export type PayrollRunStatus = 'Draft' | 'Processing' | 'Pending Approval' | 'Approved' | 'Disbursed';

interface PayrollRunAttributes {
  id: number;
  company_id: number;
  month: number;
  year: number;
  status: PayrollRunStatus;
  total_gross?: number | null;
  total_deductions?: number | null;
  total_net?: number | null;
  approved_by?: number | null;
  approved_at?: Date | null;
  disbursed_at?: Date | null;
}

export class PayrollRun
  extends Model<PayrollRunAttributes, Optional<PayrollRunAttributes, 'id' | 'status'>>
  implements PayrollRunAttributes
{
  public id!: number;
  public company_id!: number;
  public month!: number;
  public year!: number;
  public status!: PayrollRunStatus;
  public total_gross!: number | null;
  public total_deductions!: number | null;
  public total_net!: number | null;
  public approved_by!: number | null;
  public approved_at!: Date | null;
  public disbursed_at!: Date | null;
  public readonly created_at!: Date;
}

PayrollRun.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    month: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('Draft', 'Processing', 'Pending Approval', 'Approved', 'Disbursed'),
      defaultValue: 'Draft',
    },
    total_gross: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    total_deductions: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    total_net: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    approved_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    disbursed_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'payroll_runs',
    modelName: 'PayrollRun',
    indexes: [{ unique: true, fields: ['company_id', 'month', 'year'] }],
  },
);

// ─── Payslip ───────────────────────────────────────────────────

interface PayslipAttributes {
  id: number;
  payroll_run_id: number;
  employee_id: number;
  basic_salary?: number | null;
  hra?: number | null;
  special_allowance?: number | null;
  gross_salary?: number | null;
  pf_employee?: number | null;
  pf_employer?: number | null;
  esi_employee?: number | null;
  tds?: number | null;
  professional_tax?: number | null;
  total_deductions?: number | null;
  net_pay?: number | null;
  lop_days?: number | null;
  working_days?: number | null;
  paid_days?: number | null;
  payslip_url?: string | null;
  generated_at?: Date | null;
}

export class Payslip
  extends Model<PayslipAttributes, Optional<PayslipAttributes, 'id'>>
  implements PayslipAttributes
{
  public id!: number;
  public payroll_run_id!: number;
  public employee_id!: number;
  public basic_salary!: number | null;
  public hra!: number | null;
  public special_allowance!: number | null;
  public gross_salary!: number | null;
  public pf_employee!: number | null;
  public pf_employer!: number | null;
  public esi_employee!: number | null;
  public tds!: number | null;
  public professional_tax!: number | null;
  public total_deductions!: number | null;
  public net_pay!: number | null;
  public lop_days!: number | null;
  public working_days!: number | null;
  public paid_days!: number | null;
  public payslip_url!: string | null;
  public generated_at!: Date | null;
}

Payslip.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    payroll_run_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    basic_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    hra: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    special_allowance: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    gross_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    pf_employee: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    pf_employer: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    esi_employee: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    tds: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    professional_tax: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    total_deductions: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    net_pay: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    lop_days: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    working_days: { type: DataTypes.TINYINT, allowNull: true },
    paid_days: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    payslip_url: { type: DataTypes.STRING(500), allowNull: true },
    generated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'payslips',
    modelName: 'Payslip',
    timestamps: false,
    indexes: [{ fields: ['employee_id'] }, { fields: ['payroll_run_id'] }],
  },
);
