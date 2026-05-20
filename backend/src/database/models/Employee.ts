import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface EmployeeAttributes {
  id: number;
  company_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  personal_email?: string | null;
  phone?: string | null;
  date_of_birth?: Date | null;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say' | null;
  blood_group?: string | null;
  marital_status?: 'Single' | 'Married' | 'Divorced' | 'Widowed' | null;
  nationality?: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  department_id?: number | null;
  designation_id?: number | null;
  reporting_manager_id?: number | null;
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  work_location: 'Office' | 'WFH' | 'Hybrid';
  date_of_joining?: Date | null;
  date_of_confirmation?: Date | null;
  status: 'Active' | 'On_Probation' | 'Left' | 'Absconding';
  // Statutory (sensitive)
  aadhaar_number?: string | null;
  pan_number?: string | null;
  passport_number?: string | null;
  uan_number?: string | null;
  pf_number?: string | null;
  esi_number?: string | null;
  // Bank (sensitive)
  bank_name?: string | null;
  bank_account_number?: string | null;
  ifsc_code?: string | null;
  avatar_url?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  deleted_by?: number | null;
}

interface EmployeeCreationAttributes
  extends Optional<EmployeeAttributes, 'id' | 'employment_type' | 'work_location' | 'status' | 'nationality'> {}

export class Employee extends Model<EmployeeAttributes, EmployeeCreationAttributes> implements EmployeeAttributes {
  public id!: number;
  public company_id!: number;
  public employee_code!: string;
  public first_name!: string;
  public last_name!: string;
  public email!: string;
  public personal_email!: string | null;
  public phone!: string | null;
  public date_of_birth!: Date | null;
  public gender!: 'Male' | 'Female' | 'Other' | 'Prefer not to say' | null;
  public blood_group!: string | null;
  public marital_status!: 'Single' | 'Married' | 'Divorced' | 'Widowed' | null;
  public nationality!: string;
  public address_line1!: string | null;
  public address_line2!: string | null;
  public city!: string | null;
  public state!: string | null;
  public pincode!: string | null;
  public department_id!: number | null;
  public designation_id!: number | null;
  public reporting_manager_id!: number | null;
  public employment_type!: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  public work_location!: 'Office' | 'WFH' | 'Hybrid';
  public date_of_joining!: Date | null;
  public date_of_confirmation!: Date | null;
  public status!: 'Active' | 'On_Probation' | 'Left' | 'Absconding';
  public aadhaar_number!: string | null;
  public pan_number!: string | null;
  public passport_number!: string | null;
  public uan_number!: string | null;
  public pf_number!: string | null;
  public esi_number!: string | null;
  public bank_name!: string | null;
  public bank_account_number!: string | null;
  public ifsc_code!: string | null;
  public avatar_url!: string | null;
  public created_by!: number | null;
  public updated_by!: number | null;
  public deleted_by!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  // Virtual full name
  get fullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }
}

Employee.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    employee_code: { type: DataTypes.STRING(50), allowNull: false },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, validate: { isEmail: true } },
    personal_email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
    gender: { type: DataTypes.ENUM('Male', 'Female', 'Other', 'Prefer not to say'), allowNull: true },
    blood_group: { type: DataTypes.STRING(5), allowNull: true },
    marital_status: { type: DataTypes.ENUM('Single', 'Married', 'Divorced', 'Widowed'), allowNull: true },
    nationality: { type: DataTypes.STRING(100), defaultValue: 'Indian' },
    address_line1: { type: DataTypes.STRING(300), allowNull: true },
    address_line2: { type: DataTypes.STRING(300), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(100), allowNull: true },
    pincode: { type: DataTypes.STRING(10), allowNull: true },
    department_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    designation_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    reporting_manager_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    employment_type: {
      type: DataTypes.ENUM('Full-time', 'Part-time', 'Contract', 'Intern'),
      defaultValue: 'Full-time',
    },
    work_location: { type: DataTypes.ENUM('Office', 'WFH', 'Hybrid'), defaultValue: 'Office' },
    date_of_joining: { type: DataTypes.DATEONLY, allowNull: true },
    date_of_confirmation: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM('Active', 'On_Probation', 'Left', 'Absconding'),
      defaultValue: 'On_Probation',
    },
    aadhaar_number: { type: DataTypes.STRING(20), allowNull: true },
    pan_number: { type: DataTypes.STRING(20), allowNull: true },
    passport_number: { type: DataTypes.STRING(30), allowNull: true },
    uan_number: { type: DataTypes.STRING(20), allowNull: true },
    pf_number: { type: DataTypes.STRING(30), allowNull: true },
    esi_number: { type: DataTypes.STRING(30), allowNull: true },
    bank_name: { type: DataTypes.STRING(200), allowNull: true },
    bank_account_number: { type: DataTypes.STRING(50), allowNull: true },
    ifsc_code: { type: DataTypes.STRING(20), allowNull: true },
    avatar_url: { type: DataTypes.STRING(500), allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    sequelize,
    tableName: 'employees',
    modelName: 'Employee',
    paranoid: true,
    indexes: [
      { unique: true, fields: ['company_id', 'employee_code'] },
      { fields: ['department_id'] },
      { fields: ['status'] },
      { fields: ['email'] },
    ],
  },
);