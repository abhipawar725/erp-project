import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export type AttendanceStatus = 'Present' | 'Absent' | 'WFH' | 'Half-Day' | 'Holiday' | 'Leave';
export type AttendanceSource = 'Biometric' | 'Manual' | 'Mobile' | 'System';

interface AttendanceAttributes {
  id: number;
  employee_id: number;
  date: string;
  status: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
  working_hours?: number | null;
  source: AttendanceSource;
  remarks?: string | null;
  created_by?: number | null;
}

interface AttendanceCreationAttributes
  extends Optional<AttendanceAttributes, 'id' | 'source'> {}

export class Attendance
  extends Model<AttendanceAttributes, AttendanceCreationAttributes>
  implements AttendanceAttributes
{
  public id!: number;
  public employee_id!: number;
  public date!: string;
  public status!: AttendanceStatus;
  public check_in!: string | null;
  public check_out!: string | null;
  public working_hours!: number | null;
  public source!: AttendanceSource;
  public remarks!: string | null;
  public created_by!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Attendance.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('Present', 'Absent', 'WFH', 'Half-Day', 'Holiday', 'Leave'),
      allowNull: false,
    },
    check_in: { type: DataTypes.TIME, allowNull: true },
    check_out: { type: DataTypes.TIME, allowNull: true },
    working_hours: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    source: {
      type: DataTypes.ENUM('Biometric', 'Manual', 'Mobile', 'System'),
      defaultValue: 'Manual',
    },
    remarks: { type: DataTypes.STRING(500), allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    sequelize,
    tableName: 'attendance',
    modelName: 'Attendance',
    indexes: [
      { unique: true, fields: ['employee_id', 'date'] },
      { fields: ['date'] },
    ],
  },
);
