import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';


export const SYSTEM_GROUPS = [
  {
    name:        'Super Admin',
    slug:        'super_admin',
    description: 'Full access to everything — cannot be modified',
    color:       '#cc2a2a',
    is_system:   true,
    slug_grants: [] as string[], // handled by is_super_admin flag
  },
  {
    name:        'HR Manager',
    slug:        'hr_manager',
    description: 'Full HR operations — employee lifecycle, leave, attendance',
    color:       '#1e56d9',
    is_system:   true,
    slug_grants: [
      'employees:view','employees:edit','employees:mask','employees:download',
      'attendance:view','attendance:edit','attendance:download',
      'leaves:view','leaves:edit','leaves:approve',
      'payroll:view',
      'departments:view','departments:edit',
      'recruitment:view','recruitment:edit',
      'compliance:view',
    ],
  },
  {
    name:        'Finance Manager',
    slug:        'finance_manager',
    description: 'Payroll, expenses, and financial reports',
    color:       '#0d8a7e',
    is_system:   true,
    slug_grants: [
      'employees:view',
      'payroll:view','payroll:edit','payroll:approve','payroll:download',
      'compliance:view',
    ],
  },
  {
    name:        'Payroll Executive',
    slug:        'payroll_executive',
    description: 'Process and manage payroll — no delete access',
    color:       '#6c31d9',
    is_system:   true,
    slug_grants: [
      'employees:view',
      'payroll:view','payroll:edit','payroll:download',
    ],
  },
  {
    name:        'Recruiter',
    slug:        'recruiter',
    description: 'End-to-end recruitment and ATS management',
    color:       '#c96f00',
    is_system:   true,
    slug_grants: [
      'recruitment:view','recruitment:edit','recruitment:mask',
      'employees:view',
    ],
  },
  {
    name:        'Department Manager',
    slug:        'dept_manager',
    description: 'Manage team members, approve leaves and attendance',
    color:       '#0d9669',
    is_system:   true,
    slug_grants: [
      'employees:view',
      'attendance:view','attendance:edit',
      'leaves:view','leaves:approve',
      'departments:view',
    ],
  },
  {
    name:        'IT Admin',
    slug:        'it_admin',
    description: 'Asset management, system settings',
    color:       '#64748b',
    is_system:   true,
    slug_grants: [
      'assets:view','assets:create','assets:edit','assets:mask',
      'assets:assign','assets:return','assets:manage_categories',
      'assets:maintenance','assets:audit','assets:download',
      'settings:view','settings:edit',
    ],
  },
  {
    name:        'Employee Self-Service',
    slug:        'employee_self',
    description: 'View own data, apply for leaves, request assets',
    color:       '#94a3b8',
    is_system:   true,
    slug_grants: [
      'employees:view',
      'leaves:view','leaves:edit',
      'attendance:view',
      'assets:request',
    ],
  },
] as const;

// ─── PermissionGroup ──────────────────────────────────────────────────────────

interface PermissionGroupAttrs {
  id:          number;
  company_id:  number;
  name:        string;
  slug:        string;
  description: string | null;
  color:       string | null;
  is_system:   boolean;
  is_active:   boolean;
  created_by:  number | null;
}

export class PermissionGroup
  extends Model<PermissionGroupAttrs, Optional<PermissionGroupAttrs,
    'id' | 'description' | 'color' | 'is_system' | 'is_active' | 'created_by'>>
  implements PermissionGroupAttrs
{
  public id!:          number;
  public company_id!:  number;
  public name!:        string;
  public slug!:        string;
  public description!: string | null;
  public color!:       string | null;
  public is_system!:   boolean;
  public is_active!:   boolean;
  public created_by!:  number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  // populated by associations
  public permissions?: any[];
  public members?:     any[];
}

PermissionGroup.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  name:        { type: DataTypes.STRING(100), allowNull: false },
  slug:        { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  color:       { type: DataTypes.STRING(30), allowNull: true },
  is_system:   { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize,
  tableName:  'permission_groups',
  modelName:  'PermissionGroup',
  paranoid:   true,
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  'updated_at',
  deletedAt:  'deleted_at',
  indexes: [{ unique: true, fields: ['company_id', 'slug'] }],
});

// ─── GroupPermission — join: permission_group ↔ permissions ──────────────────

export class GroupPermission extends Model {
  public id!:            number;
  public group_id!:      number;
  public permission_id!: number;
}

GroupPermission.init({
  id:            { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  group_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  permission_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
}, {
  sequelize,
  tableName:  'group_permissions',
  modelName:  'GroupPermission',
  timestamps: false,
  indexes: [{ unique: true, fields: ['group_id', 'permission_id'] }],
});

// ─── UserGroup — join: employee ↔ permission_group ───────────────────────────
// NOTE: field is employee_id (was user_id — migrated in 002_user_groups_employee_id.sql)

export class UserGroup extends Model {
  public id!:           number;
  public employee_id!:  number;   // ← was user_id
  public group_id!:     number;
  public company_id!:   number;
  public assigned_by!:  number | null;
  public readonly assigned_at!: Date;
}

UserGroup.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },  // ← was user_id
  group_id:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  company_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  assigned_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  assigned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:  'user_groups',
  modelName:  'UserGroup',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['employee_id', 'group_id'] },
    { fields: ['company_id', 'group_id'] },
  ],
});
