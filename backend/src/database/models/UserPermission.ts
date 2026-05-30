/**
 * User-based permission system.
 *
 * Architecture:
 *   1. User has a role_id → role gives module-level access (role_permissions table)
 *   2. UserModulePermission overrides CRUD access per user per module
 *   3. UserFieldPermission overrides field visibility per user (wraps existing Employee/Candidate fields)
 *
 * This wraps around the existing FieldPermission (role-based) system.
 * Resolution order:  user-level override → role-level default → deny
 */
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── Modules known to the system ──────────────────────────────────────────────
export const SYSTEM_MODULES = [
  'employees', 'candidates', 'attendance', 'leave',
  'payroll', 'departments', 'designations', 'reports',
] as const;
export type SystemModule = typeof SYSTEM_MODULES[number];

// ─── Field registry — all existing fields per module ─────────────────────────
// These map directly to the real DB column names on Employee / Candidate models.
// DO NOT change these — they are the single source of truth.
export const MODULE_FIELDS: Record<SystemModule, string[]> = {
  employees: [
    'employee_code','first_name','last_name','email','personal_email','phone',
    'date_of_birth','gender','blood_group','marital_status','nationality',
    'address_line1','address_line2','city','state','pincode',
    'department_id','designation_id','reporting_manager_id',
    'employment_type','work_location','date_of_joining','date_of_confirmation','status',
    'aadhaar_number','pan_number','passport_number',
    'uan_number','pf_number','esi_number',
    'bank_name','bank_account_number','ifsc_code',
    'avatar_url',
  ],
  candidates: [
    'candidate_name','email','phone_number','gender','date_of_birth',
    'current_company_name','last_company_designation','qualification','location',
    'total_experience','relevant_experience','skills',
    'current_salary','expected_salary','notice_period',
    'immediate_joiner','expected_joining_date','own_vehicle',
    'source','reference_source','remarks','resume_url','status',
    'interview_date','interview_time','interview_type','interview_link',
    'offered_ctc','confirmed_joining_date','offer_valid_till',
    'aadhaar','pan',
  ],
  attendance: ['employee_id','date','check_in','check_out','status','hours_worked','remarks'],
  leave:      ['employee_id','leave_type_id','from_date','to_date','days','reason','status'],
  payroll:    ['employee_id','month','year','basic','hra','da','bonus','gross','tds','net_pay','status'],
  departments:['name','code','head_id','parent_id','description','is_active'],
  designations:['name','grade','department_id','is_active'],
  reports:    ['module','date_range','filters','format'],
};

// Human-readable labels for fields (used in the admin UI)
export const FIELD_LABELS: Record<string, string> = {
  employee_code:'Employee Code', first_name:'First Name', last_name:'Last Name',
  email:'Work Email', personal_email:'Personal Email', phone:'Phone',
  date_of_birth:'Date of Birth', gender:'Gender', blood_group:'Blood Group',
  marital_status:'Marital Status', nationality:'Nationality',
  address_line1:'Address Line 1', address_line2:'Address Line 2',
  city:'City', state:'State', pincode:'PIN Code',
  department_id:'Department', designation_id:'Designation',
  reporting_manager_id:'Reporting Manager',
  employment_type:'Employment Type', work_location:'Work Location',
  date_of_joining:'Date of Joining', date_of_confirmation:'Confirmation Date',
  status:'Status', aadhaar_number:'Aadhaar Number', pan_number:'PAN Number',
  passport_number:'Passport Number', uan_number:'UAN Number',
  pf_number:'PF Number', esi_number:'ESI Number',
  bank_name:'Bank Name', bank_account_number:'Bank Account', ifsc_code:'IFSC Code',
  avatar_url:'Profile Photo',
  candidate_name:'Candidate Name', phone_number:'Phone', current_company_name:'Current Company',
  last_company_designation:'Last Designation', qualification:'Qualification',
  location:'Location', total_experience:'Total Experience', relevant_experience:'Relevant Experience',
  skills:'Skills', current_salary:'Current Salary', expected_salary:'Expected Salary',
  notice_period:'Notice Period', immediate_joiner:'Immediate Joiner',
  expected_joining_date:'Expected Joining', own_vehicle:'Own Vehicle',
  source:'Source', reference_source:'Reference Source', remarks:'Remarks',
  resume_url:'Resume', interview_date:'Interview Date', interview_time:'Interview Time',
  interview_type:'Interview Type', interview_link:'Interview Link',
  offered_ctc:'Offered CTC', confirmed_joining_date:'Joining Date',
  offer_valid_till:'Offer Valid Till', aadhaar:'Aadhaar', pan:'PAN',
};

// Sensitive fields — default masked for non-super-admin
export const SENSITIVE_FIELDS: string[] = [
  'aadhaar_number','pan_number','passport_number',
  'uan_number','pf_number','esi_number',
  'bank_account_number','ifsc_code',
  'current_salary','expected_salary','offered_ctc','net_pay','gross','tds',
  'aadhaar','pan',
];

// ─── UserModulePermission — CRUD access per user per module ──────────────────

export interface UserModulePerm {
  id:         number;
  company_id: number;
  user_id:    number;
  module:     SystemModule;
  can_view:   boolean;
  can_create: boolean;
  can_edit:   boolean;
  can_delete: boolean;
  can_approve:boolean;
  can_export: boolean;
  created_by?: number | null;
  updated_at?: Date;
}

export class UserModulePermission
  extends Model<UserModulePerm, Optional<UserModulePerm,'id'|'can_view'|'can_create'|'can_edit'|'can_delete'|'can_approve'|'can_export'>>
  implements UserModulePerm
{
  public id!:          number;
  public company_id!:  number;
  public user_id!:     number;
  public module!:      SystemModule;
  public can_view!:    boolean;
  public can_create!:  boolean;
  public can_edit!:    boolean;
  public can_delete!:  boolean;
  public can_approve!: boolean;
  public can_export!:  boolean;
  public created_by!:  number | null;
  public readonly updated_at!: Date;
}

UserModulePermission.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  user_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  module:      { type: DataTypes.ENUM(...SYSTEM_MODULES), allowNull: false },
  can_view:    { type: DataTypes.BOOLEAN, defaultValue: false },
  can_create:  { type: DataTypes.BOOLEAN, defaultValue: false },
  can_edit:    { type: DataTypes.BOOLEAN, defaultValue: false },
  can_delete:  { type: DataTypes.BOOLEAN, defaultValue: false },
  can_approve: { type: DataTypes.BOOLEAN, defaultValue: false },
  can_export:  { type: DataTypes.BOOLEAN, defaultValue: false },
  created_by:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize, tableName: 'user_module_permissions', modelName: 'UserModulePermission',
  timestamps: true, createdAt: false, updatedAt: 'updated_at',
  indexes: [{ unique: true, fields: ['company_id','user_id','module'] }],
});

// ─── UserFieldPermission — field-level access per user, wraps existing fields ─

export interface UserFieldPerm {
  id:           number;
  company_id:   number;
  user_id:      number;
  module:       SystemModule;
  field_name:   string;   // maps to real DB column name
  can_view:     boolean;
  can_edit:     boolean;
  is_masked:    boolean;
  is_hidden:    boolean;  // hidden = can_view false AND not even sent to client
  is_readonly:  boolean;  // readonly = can_view true, can_edit false, not masked
  created_by?:  number | null;
  updated_at?:  Date;
}

export class UserFieldPermission
  extends Model<UserFieldPerm, Optional<UserFieldPerm,'id'|'can_view'|'can_edit'|'is_masked'|'is_hidden'|'is_readonly'>>
  implements UserFieldPerm
{
  public id!:          number;
  public company_id!:  number;
  public user_id!:     number;
  public module!:      SystemModule;
  public field_name!:  string;
  public can_view!:    boolean;
  public can_edit!:    boolean;
  public is_masked!:   boolean;
  public is_hidden!:   boolean;
  public is_readonly!: boolean;
  public created_by!:  number | null;
  public readonly updated_at!: Date;
}

UserFieldPermission.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  user_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  module:      { type: DataTypes.ENUM(...SYSTEM_MODULES), allowNull: false },
  field_name:  { type: DataTypes.STRING(200), allowNull: false },
  can_view:    { type: DataTypes.BOOLEAN, defaultValue: true },
  can_edit:    { type: DataTypes.BOOLEAN, defaultValue: true },
  is_masked:   { type: DataTypes.BOOLEAN, defaultValue: false },
  is_hidden:   { type: DataTypes.BOOLEAN, defaultValue: false },
  is_readonly: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_by:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize, tableName: 'user_field_permissions', modelName: 'UserFieldPermission',
  timestamps: true, createdAt: false, updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['company_id','user_id','module','field_name'] },
    { fields: ['company_id','user_id'] },
  ],
});
