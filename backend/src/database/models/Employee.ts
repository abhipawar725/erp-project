import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─────────────────────────────────────────────────────────────────────────────
// 1. employees  (core identity + employment + auth — single source of truth)
// ─────────────────────────────────────────────────────────────────────────────
interface EmployeeAttrs {
  id: number;
  company_id: number;
  reference_code: string | null;
  employee_code: string;
  status: 'Active' | 'Left' | 'Retired';
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  employment_type: 'Permanent' | 'Contractual';
  department_id?: number | null;
  sub_department_id?: number | null;
  designation_id?: number | null;
  sub_designation?: string | null;

  // Reporting — INTEGER FK into employees.id (not employee_code string)
  l1_manager_id?: number | null;  // FK → employees.id
  l2_manager_id?: number | null;  // FK → employees.id

  email?: string;
  phone?: string;
  actual_doj?: Date | null;
  current_doj?: Date | null;
  working_site?: string | null;
  working_city?: string | null;
  working_state_country?: string | null;
  pay_register_location?: string | null;
  shift_id?: number | null;
  saturday_off: boolean;
  grace_minutes: number;
  form_completion_pct: number;
  avatar_url?: string | null;

  // ── Auth fields (no separate users table — employee IS the user) ─────────
  portal_access: boolean;    // controls login ability, independent of HR status
  is_super_admin: boolean;    // bypasses ALL permission checks
  otp_hash?: string | null;
  otp_expires?: Date | null;
  otp_attempts: number;
  otp_locked_until?: Date | null;
  refresh_token?: string | null;
  refresh_expires?: Date | null;
  last_login_at?: Date | null;
  must_change_password: boolean;

  // ── Meta ──────────────────────────────────────────────────────────────────
  created_by?: number | null;
  updated_by?: number | null;
  deleted_by?: number | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

type EmployeeCreation = Optional<EmployeeAttrs,
  'id' | 'reference_code' | 'middle_name' | 'sub_designation'
  | 'l1_manager_id' | 'l2_manager_id' | 'email' | 'phone'
  | 'actual_doj' | 'current_doj' | 'working_site' | 'working_city'
  | 'working_state_country' | 'pay_register_location' | 'shift_id'
  | 'saturday_off' | 'grace_minutes' | 'form_completion_pct' | 'avatar_url'
  | 'portal_access' | 'is_super_admin' | 'otp_hash' | 'otp_expires'
  | 'otp_attempts' | 'otp_locked_until' | 'refresh_token' | 'refresh_expires'
  | 'last_login_at' | 'must_change_password'
  | 'created_by' | 'updated_by' | 'deleted_by' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export class Employee extends Model<EmployeeAttrs, EmployeeCreation> implements EmployeeAttrs {
  public id!: number;
  public company_id!: number;
  public reference_code!: string | null;
  public employee_code!: string;
  public status!: 'Active' | 'Left' | 'Retired';
  public first_name!: string;
  public middle_name!: string | null;
  public last_name!: string;
  public employment_type!: 'Permanent' | 'Contractual';
  public department_id!: number | null;
  public sub_department_id!: number | null;
  public designation_id!: number | null;
  public sub_designation!: string | null;
  public l1_manager_id!: number | null;
  public l2_manager_id!: number | null;
  public email!: string;
  public phone!: string;
  public actual_doj!: Date | null;
  public current_doj!: Date | null;
  public working_site!: string | null;
  public working_city!: string | null;
  public working_state_country!: string | null;
  public pay_register_location!: string | null;
  public shift_id!: number | null;
  public saturday_off!: boolean;
  public grace_minutes!: number;
  public form_completion_pct!: number;
  public avatar_url!: string | null;
  // Auth
  public portal_access!: boolean;
  public is_super_admin!: boolean;
  public otp_hash!: string | null;
  public otp_expires!: Date | null;
  public otp_attempts!: number;
  public otp_locked_until!: Date | null;
  public refresh_token!: string | null;
  public refresh_expires!: Date | null;
  public last_login_at!: Date | null;
  public must_change_password!: boolean;
  // Meta
  public created_by!: number | null;
  public updated_by!: number | null;
  public deleted_by!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  // Virtuals
  get fullName(): string { return [this.first_name, this.middle_name, this.last_name].filter(Boolean).join(' '); }
  get canLogin(): boolean { return this.portal_access && !this.deleted_at; }
  get isLocked(): boolean { return !!this.otp_locked_until && this.otp_locked_until > new Date(); }

  // Populated by includes
  public l1Manager?: Employee;
  public l2Manager?: Employee;
  public commitmentProbation?: any;
  public schemes?: any;
  public personal?: any;
  public family?: any;
  public addresses?: any[];
  public emergencyContacts?: any[];
  public statutory?: any;
  public bankDetails?: any[];
  public salaries?: any[];
  public assetDeduction?: any;
  public experience?: any;
  public education?: any;
  public onboardingDocs?: any;
  public transfers?: any[];
  public exit?: any;
}

Employee.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  reference_code: { type: DataTypes.STRING(50), allowNull: true },
  employee_code: { type: DataTypes.STRING(30), allowNull: false },
  status: { type: DataTypes.ENUM('Active', 'Left', 'Retired'), defaultValue: 'Active' },
  first_name: { type: DataTypes.STRING(100), allowNull: false },
  middle_name: { type: DataTypes.STRING(100), allowNull: true },
  last_name: { type: DataTypes.STRING(100), allowNull: false },
  employment_type: { type: DataTypes.ENUM('Permanent', 'Contractual'), defaultValue: 'Permanent' },
  department_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  sub_department_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  designation_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  sub_designation: { type: DataTypes.STRING(200), allowNull: true },
  // FK to employees.id — NOT employee_code
  l1_manager_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  l2_manager_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  actual_doj: { type: DataTypes.DATEONLY, allowNull: true },
  current_doj: { type: DataTypes.DATEONLY, allowNull: true },
  working_site: { type: DataTypes.STRING(200), allowNull: true },
  working_city: { type: DataTypes.STRING(100), allowNull: true },
  working_state_country: { type: DataTypes.STRING(200), allowNull: true },
  pay_register_location: { type: DataTypes.STRING(200), allowNull: true },
  shift_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  saturday_off: { type: DataTypes.BOOLEAN, defaultValue: false },
  grace_minutes: { type: DataTypes.SMALLINT.UNSIGNED, defaultValue: 0 },
  form_completion_pct: { type: DataTypes.TINYINT.UNSIGNED, defaultValue: 0 },
  avatar_url: { type: DataTypes.STRING(500), allowNull: true },
  // ── Auth ─────────────────────────────────────────────────────────────────
  portal_access: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_super_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
  otp_hash: { type: DataTypes.STRING(255), allowNull: true },
  otp_expires: { type: DataTypes.DATE, allowNull: true },
  otp_attempts: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  otp_locked_until: { type: DataTypes.DATE, allowNull: true },
  refresh_token: { type: DataTypes.TEXT, allowNull: true },
  refresh_expires: { type: DataTypes.DATE, allowNull: true },
  last_login_at: { type: DataTypes.DATE, allowNull: true },
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
  // ── Meta ─────────────────────────────────────────────────────────────────
  created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize, tableName: 'employees', modelName: 'Employee',
  paranoid: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
  indexes: [
    { unique: true, fields: ['company_id', 'employee_code'], where: { deleted_at: null } },
    { unique: true, fields: ['company_id', 'reference_code'], where: { deleted_at: null } },
    { fields: ['company_id', 'status'] },
    { fields: ['department_id'] },
    { fields: ['l1_manager_id'] },
    { fields: ['portal_access'] },
    { fields: ['is_super_admin'] },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. employee_commitment_probation
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeCommitmentProbation extends Model {
  public employee_id!: number;
  public commitment!: boolean;
  public commitment_term!: string | null;
  public commitment_entered_on!: Date | null;
  public commitment_end_date!: Date | null;
  public commitment_status!: string | null;
  public on_probation!: boolean;
  public probation_period!: string | null;
  public probation_end_date!: Date | null;
  public probation_status!: string | null;
  public probation_extended_period!: string | null;
  public probation_final_status!: string | null;
  public confirmation_status!: 'Confirmed' | 'Failed' | 'Not Applicable' | null;
  public confirmed_on!: Date | null;
}
EmployeeCommitmentProbation.init({
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  commitment: { type: DataTypes.BOOLEAN, defaultValue: false },
  commitment_term: { type: DataTypes.ENUM('36 Months', '60 Months', 'N/A'), allowNull: true },
  commitment_entered_on: { type: DataTypes.DATEONLY, allowNull: true },
  commitment_end_date: { type: DataTypes.DATEONLY, allowNull: true },
  commitment_status: { type: DataTypes.STRING(50), allowNull: true },
  on_probation: { type: DataTypes.BOOLEAN, defaultValue: true },
  probation_period: { type: DataTypes.STRING(30), allowNull: true },
  probation_end_date: { type: DataTypes.DATEONLY, allowNull: true },
  probation_status: { type: DataTypes.STRING(50), allowNull: true },
  probation_extended_period: { type: DataTypes.STRING(50), allowNull: true },
  probation_final_status: { type: DataTypes.STRING(50), allowNull: true },
  confirmation_status: { type: DataTypes.ENUM('Confirmed', 'Failed', 'Not Applicable'), allowNull: true },
  confirmed_on: { type: DataTypes.DATEONLY, allowNull: true },
}, { sequelize, tableName: 'employee_commitment_probation', modelName: 'EmployeeCommitmentProbation', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 3. employee_schemes  (PF / ESIC / Mediclaim / RD)
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeSchemes extends Model {
  public employee_id!: number;
  public pf_status!: boolean;
  public uan_number!: string | null;
  public epfo_member_id!: string | null;
  public pf_contribution_pct!: number | null;
  public pf_employer_from!: 'Employee' | 'Employer' | 'N/A' | null;
  public esic_status!: boolean;
  public esic_number!: string | null;
  public mediclaim_status!: 'Yes' | 'No' | 'Deactivate';
  public mediclaim_number!: string | null;
  public mediclaim_amount!: number | null;
  public rd_scheme!: boolean;
  public rd_term!: string | null;
  public rd_opening_date!: Date | null;
  public rd_account_number!: string | null;
  public rd_deduction_from!: 'Salary' | 'AMDB' | 'N/A' | null;
  public rd_amount_employee!: number | null;
  public rd_amount_employer!: number | null;
  public rd_maturity_date!: Date | null;
  public rd_maturity_amount!: number | null;
  public rd_status!: string | null;
}
EmployeeSchemes.init({
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  pf_status: { type: DataTypes.BOOLEAN, defaultValue: false },
  uan_number: { type: DataTypes.STRING(20), allowNull: true },
  epfo_member_id: { type: DataTypes.STRING(30), allowNull: true },
  pf_contribution_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  pf_employer_from: { type: DataTypes.ENUM('Employee', 'Employer', 'N/A'), allowNull: true },
  esic_status: { type: DataTypes.BOOLEAN, defaultValue: false },
  esic_number: { type: DataTypes.STRING(30), allowNull: true },
  mediclaim_status: { type: DataTypes.ENUM('Yes', 'No', 'Deactivate'), defaultValue: 'No' },
  mediclaim_number: { type: DataTypes.STRING(50), allowNull: true },
  mediclaim_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  rd_scheme: { type: DataTypes.BOOLEAN, defaultValue: false },
  rd_term: { type: DataTypes.ENUM('6 Months', '12 Months', '18 Months', '24 Months', '30 Months', '36 Months', 'N/A'), allowNull: true },
  rd_opening_date: { type: DataTypes.DATEONLY, allowNull: true },
  rd_account_number: { type: DataTypes.STRING(50), allowNull: true },
  rd_deduction_from: { type: DataTypes.ENUM('Salary', 'AMDB', 'N/A'), allowNull: true },
  rd_amount_employee: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  rd_amount_employer: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  rd_maturity_date: { type: DataTypes.DATEONLY, allowNull: true },
  rd_maturity_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  rd_status: { type: DataTypes.STRING(50), allowNull: true },
}, { sequelize, tableName: 'employee_schemes', modelName: 'EmployeeSchemes', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 4. employee_personal
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeePersonal extends Model {
  public employee_id!: number;
  public personal_email!: string | null;
  public personal_mobile!: string | null;
  public date_of_birth!: Date | null;
  public gender!: string | null;
  public shirt_size!: string | null;
  public tshirt_size!: string | null;
  public nationality!: string | null;
  public religion!: string | null;
  public blood_group!: string | null;
  public marital_status!: string | null;
  public marriage_date!: Date | null;
  public spouse_name!: string | null;
  public spouse_dob!: Date | null;
  public child1_name!: string | null;
  public child1_dob!: Date | null;
  public child2_name!: string | null;
  public child2_dob!: Date | null;
  public child3_name!: string | null;
  public child3_dob!: Date | null;
}
EmployeePersonal.init({
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  personal_email: { type: DataTypes.STRING(255), allowNull: true },
  personal_mobile: { type: DataTypes.STRING(20), allowNull: true },
  date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
  gender: { type: DataTypes.ENUM('Male', 'Female', 'Other', 'Prefer not to say'), allowNull: true },
  shirt_size: { type: DataTypes.STRING(10), allowNull: true },
  tshirt_size: { type: DataTypes.STRING(10), allowNull: true },
  nationality: { type: DataTypes.STRING(100), allowNull: true },
  religion: { type: DataTypes.STRING(100), allowNull: true },
  blood_group: { type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'), allowNull: true },
  marital_status: { type: DataTypes.ENUM('Single', 'Married', 'Divorced', 'Widowed', 'Separated'), allowNull: true },
  marriage_date: { type: DataTypes.DATEONLY, allowNull: true },
  spouse_name: { type: DataTypes.STRING(200), allowNull: true },
  spouse_dob: { type: DataTypes.DATEONLY, allowNull: true },
  child1_name: { type: DataTypes.STRING(200), allowNull: true },
  child1_dob: { type: DataTypes.DATEONLY, allowNull: true },
  child2_name: { type: DataTypes.STRING(200), allowNull: true },
  child2_dob: { type: DataTypes.DATEONLY, allowNull: true },
  child3_name: { type: DataTypes.STRING(200), allowNull: true },
  child3_dob: { type: DataTypes.DATEONLY, allowNull: true },
}, { sequelize, tableName: 'employee_personal', modelName: 'EmployeePersonal', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 5. employee_family
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeFamily extends Model {
  public employee_id!: number;
  public father_salutation!: string | null;
  public father_name!: string | null;
  public father_age_dob!: string | null;
  public father_occupation!: string | null;
  public father_status!: string | null;
  public mother_salutation!: string | null;
  public mother_name!: string | null;
  public mother_age_dob!: string | null;
  public mother_occupation!: string | null;
}
EmployeeFamily.init({
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  father_salutation: { type: DataTypes.ENUM('Mr.', 'Late'), allowNull: true },
  father_name: { type: DataTypes.STRING(200), allowNull: true },
  father_age_dob: { type: DataTypes.STRING(50), allowNull: true },
  father_occupation: { type: DataTypes.STRING(100), allowNull: true },
  father_status: { type: DataTypes.ENUM('Working', 'Retired', 'Not Applicable'), allowNull: true },
  mother_salutation: { type: DataTypes.ENUM('Mrs.', 'Late'), allowNull: true },
  mother_name: { type: DataTypes.STRING(200), allowNull: true },
  mother_age_dob: { type: DataTypes.STRING(50), allowNull: true },
  mother_occupation: { type: DataTypes.ENUM('Working', 'Retired', 'Not Applicable', 'House Wife'), allowNull: true },
}, { sequelize, tableName: 'employee_family', modelName: 'EmployeeFamily', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 6. employee_addresses
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeAddress extends Model {
  public id!: number;
  public employee_id!: number;
  public address_type!: 'present' | 'permanent';
  public house_type!: 'Own' | 'Rent' | null;
  public house_no!: string | null;
  public area!: string | null;
  public district!: string | null;
  public city!: string | null;
  public state!: string | null;
  public country!: string | null;
  public pincode!: string | null;
  public is_same_as_present!: boolean;
}
EmployeeAddress.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  address_type: { type: DataTypes.ENUM('present', 'permanent'), allowNull: false },
  house_type: { type: DataTypes.ENUM('Own', 'Rent'), allowNull: true },
  house_no: { type: DataTypes.STRING(50), allowNull: true },
  area: { type: DataTypes.STRING(300), allowNull: true },
  district: { type: DataTypes.STRING(100), allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: true },
  state: { type: DataTypes.STRING(100), allowNull: true },
  country: { type: DataTypes.STRING(100), defaultValue: 'India' },
  pincode: { type: DataTypes.STRING(10), allowNull: true },
  is_same_as_present: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize, tableName: 'employee_addresses', modelName: 'EmployeeAddress', timestamps: true,
  indexes: [{ unique: true, fields: ['employee_id', 'address_type'] }]
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. employee_emergency_contacts
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeEmergencyContact extends Model {
  public id!: number;
  public employee_id!: number;
  public contact_name!: string;
  public contact_number!: string;
  public relationship!: string;
  public is_primary!: boolean;
}
EmployeeEmergencyContact.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  contact_name: { type: DataTypes.STRING(200), allowNull: false },
  contact_number: { type: DataTypes.STRING(20), allowNull: false },
  relationship: { type: DataTypes.STRING(100), allowNull: false },
  is_primary: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'employee_emergency_contacts', modelName: 'EmployeeEmergencyContact', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 8. employee_statutory  (SENSITIVE)
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeStatutory extends Model {
  public employee_id!: number;
  public passport_number!: string | null;
  public passport_expiry!: Date | null;
  public yellow_fever!: boolean;
  public yellow_fever_date!: Date | null;
  public driving_license_number!: string | null;
  public driving_license_expiry!: Date | null;
  public aadhaar_number!: string | null;
  public aadhaar_address!: string | null;
  public pan_number!: string | null;
  public pan_full_name!: string | null;
  public pan_dob!: Date | null;
  public pan_parent_spouse_name!: string | null;
}
EmployeeStatutory.init({
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  passport_number: { type: DataTypes.STRING(30), allowNull: true },
  passport_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  yellow_fever: { type: DataTypes.BOOLEAN, defaultValue: false },
  yellow_fever_date: { type: DataTypes.DATEONLY, allowNull: true },
  driving_license_number: { type: DataTypes.STRING(30), allowNull: true },
  driving_license_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  aadhaar_number: { type: DataTypes.STRING(12), allowNull: true },
  aadhaar_address: { type: DataTypes.TEXT, allowNull: true },
  pan_number: { type: DataTypes.STRING(10), allowNull: true },
  pan_full_name: { type: DataTypes.STRING(200), allowNull: true },
  pan_dob: { type: DataTypes.DATEONLY, allowNull: true },
  pan_parent_spouse_name: { type: DataTypes.STRING(200), allowNull: true },
}, { sequelize, tableName: 'employee_statutory', modelName: 'EmployeeStatutory', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 9. employee_bank_details  (SENSITIVE)
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeBankDetail extends Model {
  public id!: number;
  public employee_id!: number;
  public bank_type!: 'personal' | 'official';
  public bank_name!: string | null;
  public account_number!: string | null;
  public ifsc_code!: string | null;
  public branch_name!: string | null;
}
EmployeeBankDetail.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  bank_type: { type: DataTypes.ENUM('personal', 'official'), allowNull: false },
  bank_name: { type: DataTypes.STRING(200), allowNull: true },
  account_number: { type: DataTypes.STRING(30), allowNull: true },
  ifsc_code: { type: DataTypes.STRING(15), allowNull: true },
  branch_name: { type: DataTypes.STRING(200), allowNull: true },
}, {
  sequelize, tableName: 'employee_bank_details', modelName: 'EmployeeBankDetail', timestamps: true,
  indexes: [{ unique: true, fields: ['employee_id', 'bank_type'] }]
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. employee_salary  (SENSITIVE)
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeSalary extends Model {
  public id!: number;
  public employee_id!: number;
  public salary_type!: 'current' | 'joining';
  public salary_mode!: 'Transfer' | 'Cheque' | null;
  public basic!: number | null;
  public hra!: number | null;
  public allowance1!: number | null;
  public gross_salary_pm!: number | null;
  public amdb_pm!: number | null;
  public total_earning_pm!: number | null;
  public effective_from!: Date | null;
}
EmployeeSalary.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  salary_type: { type: DataTypes.ENUM('current', 'joining'), allowNull: false },
  salary_mode: { type: DataTypes.ENUM('Transfer', 'Cheque'), allowNull: true },
  basic: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  hra: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  allowance1: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  gross_salary_pm: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  amdb_pm: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  total_earning_pm: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  effective_from: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  sequelize, tableName: 'employee_salary', modelName: 'EmployeeSalary', timestamps: true,
  indexes: [{ unique: true, fields: ['employee_id', 'salary_type'] }]
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. employee_asset_deduction
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeAssetDeduction extends Model {
  public employee_id!: number;
  public asset_deduction_applicable!: boolean;
  public security_amount!: number | null;
  public deduction_months!: string | null;
  public deduction_from!: 'Salary' | 'AMDB' | 'N/A' | null;
  public monthly_deduction!: number | null;
  public last_installment!: number | null;
}
EmployeeAssetDeduction.init({
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  asset_deduction_applicable: { type: DataTypes.BOOLEAN, defaultValue: false },
  security_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  deduction_months: { type: DataTypes.STRING(20), allowNull: true },
  deduction_from: { type: DataTypes.ENUM('Salary', 'AMDB', 'N/A'), allowNull: true },
  monthly_deduction: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  last_installment: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
}, { sequelize, tableName: 'employee_asset_deduction', modelName: 'EmployeeAssetDeduction', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 12. employee_experience
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeExperience extends Model {
  public employee_id!: number;
  public is_experienced!: boolean;
  public last_company_name!: string | null;
  public last_designation!: string | null;
  public last_working_day!: Date | null;
  public exp_contact_name!: string | null;
  public exp_contact_number!: string | null;
  public exp_contact_designation!: string | null;
  public last_inhand_salary!: number | null;
}
EmployeeExperience.init({
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  is_experienced: { type: DataTypes.BOOLEAN, defaultValue: false },
  last_company_name: { type: DataTypes.STRING(300), allowNull: true },
  last_designation: { type: DataTypes.STRING(200), allowNull: true },
  last_working_day: { type: DataTypes.DATEONLY, allowNull: true },
  exp_contact_name: { type: DataTypes.STRING(200), allowNull: true },
  exp_contact_number: { type: DataTypes.STRING(20), allowNull: true },
  exp_contact_designation: { type: DataTypes.STRING(200), allowNull: true },
  last_inhand_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
}, { sequelize, tableName: 'employee_experience', modelName: 'EmployeeExperience', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 13. employee_education
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeEducation extends Model {
  public employee_id!: number;
  public highest_education!: string | null;
  public education_stream!: string | null;
  public education_mode!: string | null;
  public institute_name!: string | null;
  public passing_year!: number | null;
  public education_marks!: string | null;
}
EmployeeEducation.init({
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  highest_education: { type: DataTypes.STRING(100), allowNull: true },
  education_stream: { type: DataTypes.STRING(100), allowNull: true },
  education_mode: { type: DataTypes.STRING(50), allowNull: true },
  institute_name: { type: DataTypes.STRING(300), allowNull: true },
  passing_year: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
  education_marks: { type: DataTypes.STRING(20), allowNull: true },
}, { sequelize, tableName: 'employee_education', modelName: 'EmployeeEducation', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 14. employee_onboarding_docs
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeOnboardingDocs extends Model {
  public employee_id!: number;
  public offer_letter!: boolean;
  public address_verification!: boolean;
  public service_agreement!: boolean;
  public indemnity_bond!: boolean;
  public asset_deduction_letter!: boolean;
  public account_opening_letter!: boolean;
  public nda!: boolean;
}
EmployeeOnboardingDocs.init({
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  offer_letter: { type: DataTypes.BOOLEAN, defaultValue: false },
  address_verification: { type: DataTypes.BOOLEAN, defaultValue: false },
  service_agreement: { type: DataTypes.BOOLEAN, defaultValue: false },
  indemnity_bond: { type: DataTypes.BOOLEAN, defaultValue: false },
  asset_deduction_letter: { type: DataTypes.BOOLEAN, defaultValue: false },
  account_opening_letter: { type: DataTypes.BOOLEAN, defaultValue: false },
  nda: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { sequelize, tableName: 'employee_onboarding_docs', modelName: 'EmployeeOnboardingDocs', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 15. employee_transfers  (up to 5 per employee)
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeTransfer extends Model {
  public id!: number;
  public employee_id!: number;
  public transfer_order!: number;
  public transferred_on!: Date | null;
  public new_company!: string | null;
  public new_joining_date!: Date | null;
  public new_location!: string | null;
  public new_department!: string | null;
  public new_job_title!: string | null;
  public old_company!: string | null;
  public exit_date!: Date | null;
  public old_location!: string | null;
  public old_department!: string | null;
  public old_job_title!: string | null;
  public old_emp_code!: string | null;
}
EmployeeTransfer.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  transfer_order: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  transferred_on: { type: DataTypes.DATEONLY, allowNull: true },
  new_company: { type: DataTypes.STRING(200), allowNull: true },
  new_joining_date: { type: DataTypes.DATEONLY, allowNull: true },
  new_location: { type: DataTypes.STRING(200), allowNull: true },
  new_department: { type: DataTypes.STRING(200), allowNull: true },
  new_job_title: { type: DataTypes.STRING(200), allowNull: true },
  old_company: { type: DataTypes.STRING(200), allowNull: true },
  exit_date: { type: DataTypes.DATEONLY, allowNull: true },
  old_location: { type: DataTypes.STRING(200), allowNull: true },
  old_department: { type: DataTypes.STRING(200), allowNull: true },
  old_job_title: { type: DataTypes.STRING(200), allowNull: true },
  old_emp_code: { type: DataTypes.STRING(30), allowNull: true },
}, {
  sequelize, tableName: 'employee_transfers', modelName: 'EmployeeTransfer', timestamps: true,
  indexes: [{ fields: ['employee_id', 'transfer_order'] }]
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. employee_exit
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeExit extends Model {
  public employee_id!: number;
  public resignation_submitted!: boolean;
  public resignation_date!: Date | null;
  public notice_period!: string | null;
  public last_working_day!: Date | null;
  public exit_formalities_done!: boolean;
  public exit_status!: string | null;
  public exit_remarks!: string | null;
  public verified!: boolean;
  public verified_by!: string | null;
  public verification_remarks!: string | null;
}
EmployeeExit.init({
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  resignation_submitted: { type: DataTypes.BOOLEAN, defaultValue: false },
  resignation_date: { type: DataTypes.DATEONLY, allowNull: true },
  notice_period: { type: DataTypes.STRING(50), allowNull: true },
  last_working_day: { type: DataTypes.DATEONLY, allowNull: true },
  exit_formalities_done: { type: DataTypes.BOOLEAN, defaultValue: false },
  exit_status: { type: DataTypes.STRING(50), allowNull: true },
  exit_remarks: { type: DataTypes.TEXT, allowNull: true },
  verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verified_by: { type: DataTypes.STRING(200), allowNull: true },
  verification_remarks: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'employee_exit', modelName: 'EmployeeExit', timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// 17. employee_drafts  (auto-save sessions)
// ─────────────────────────────────────────────────────────────────────────────
export class EmployeeDraft extends Model {
  public id!: number;
  public employee_id!: number | null;
  public created_by!: number;           // FK → employees.id of the HR saving
  public step!: string;
  public form_data!: object;
  public session_id!: string;
  public expires_at!: Date;
}
EmployeeDraft.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  step: { type: DataTypes.STRING(50), allowNull: false },
  form_data: { type: DataTypes.JSON, allowNull: false },
  session_id: { type: DataTypes.STRING(100), allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize, tableName: 'employee_drafts', modelName: 'EmployeeDraft', timestamps: true,
  indexes: [{ fields: ['created_by', 'session_id'] }, { fields: ['employee_id'] }]
});

