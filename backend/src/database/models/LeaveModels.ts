import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── Leave Type ────────────────────────────────────────────────

interface LeaveTypeAttributes {
  id: number;
  company_id: number;
  name: string;
  code: string;
  days_per_year: number;
  is_paid: boolean;
  carry_forward: boolean;
  max_carry_days: number;
  is_active: boolean;
}

export class LeaveType
  extends Model<LeaveTypeAttributes, Optional<LeaveTypeAttributes, 'id' | 'is_paid' | 'carry_forward' | 'max_carry_days' | 'is_active'>>
  implements LeaveTypeAttributes
{
  public id!: number;
  public company_id!: number;
  public name!: string;
  public code!: string;
  public days_per_year!: number;
  public is_paid!: boolean;
  public carry_forward!: boolean;
  public max_carry_days!: number;
  public is_active!: boolean;
}

LeaveType.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    code: { type: DataTypes.STRING(10), allowNull: false },
    days_per_year: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    is_paid: { type: DataTypes.BOOLEAN, defaultValue: true },
    carry_forward: { type: DataTypes.BOOLEAN, defaultValue: false },
    max_carry_days: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, tableName: 'leave_types', modelName: 'LeaveType', timestamps: false },
);

// ─── Leave Request ─────────────────────────────────────────────

export type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

interface LeaveRequestAttributes {
  id: number;
  employee_id: number;
  leave_type_id: number;
  from_date: string;
  to_date: string;
  days: number;
  half_day: boolean;
  reason?: string | null;
  status: LeaveRequestStatus;
  approved_by?: number | null;
  approved_at?: Date | null;
  rejection_reason?: string | null;
}

export class LeaveRequest
  extends Model<LeaveRequestAttributes, Optional<LeaveRequestAttributes, 'id' | 'half_day' | 'status'>>
  implements LeaveRequestAttributes
{
  public id!: number;
  public employee_id!: number;
  public leave_type_id!: number;
  public from_date!: string;
  public to_date!: string;
  public days!: number;
  public half_day!: boolean;
  public reason!: string | null;
  public status!: LeaveRequestStatus;
  public approved_by!: number | null;
  public approved_at!: Date | null;
  public rejection_reason!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

LeaveRequest.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    leave_type_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    from_date: { type: DataTypes.DATEONLY, allowNull: false },
    to_date: { type: DataTypes.DATEONLY, allowNull: false },
    days: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    half_day: { type: DataTypes.BOOLEAN, defaultValue: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Cancelled'),
      defaultValue: 'Pending',
    },
    approved_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: 'leave_requests',
    modelName: 'LeaveRequest',
    indexes: [{ fields: ['employee_id'] }, { fields: ['status'] }],
  },
);
