/**
 * PermissionGroups — enterprise permission group system.
 *
 * Architecture adds a third layer on top of roles:
 *
 *   User → Role (broad category: HR, Manager, Employee)
 *        → PermissionGroup (fine-grained: Payroll Executive, Recruiter, IT Admin)
 *
 * Resolution order:
 *   1. is_super_admin → full access
 *   2. roleSlug === 'hr'|'admin' → full access
 *   3. PermissionGroup slugs (union of all groups user belongs to)
 *   4. Role slugs from role_permissions
 *   5. user_module_permissions (user-level overrides)
 *
 * A user can belong to multiple groups simultaneously.
 * Groups accumulate — permissions are additive (union), never subtractive.
 */
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── Preset group templates (seeded on company creation) ─────────────────────

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
      'employees:read','employees:write','employees:delete','employees:export',
      'attendance:read','attendance:write','attendance:export',
      'leaves:read','leaves:write','leaves:approve',
      'payroll:read',
      'departments:read','departments:write',
      'recruitment:read','recruitment:write',
      'compliance:read',
    ],
  },
  {
    name:        'Finance Manager',
    slug:        'finance_manager',
    description: 'Payroll, expenses, and financial reports',
    color:       '#0d8a7e',
    is_system:   true,
    slug_grants: [
      'employees:read',
      'payroll:read','payroll:write','payroll:approve','payroll:export',
      'compliance:read',
    ],
  },
  {
    name:        'Payroll Executive',
    slug:        'payroll_executive',
    description: 'Process and manage payroll — no delete access',
    color:       '#6c31d9',
    is_system:   true,
    slug_grants: [
      'employees:read',
      'payroll:read','payroll:write','payroll:export',
    ],
  },
  {
    name:        'Recruiter',
    slug:        'recruiter',
    description: 'End-to-end recruitment and ATS management',
    color:       '#c96f00',
    is_system:   true,
    slug_grants: [
      'recruitment:read','recruitment:write','recruitment:delete',
      'employees:read',
    ],
  },
  {
    name:        'Department Manager',
    slug:        'dept_manager',
    description: 'Manage team members, approve leaves and attendance',
    color:       '#0d9669',
    is_system:   true,
    slug_grants: [
      'employees:read',
      'attendance:read','attendance:write',
      'leaves:read','leaves:approve',
      'departments:read',
    ],
  },
  {
    name:        'IT Admin',
    slug:        'it_admin',
    description: 'Asset management, system settings',
    color:       '#64748b',
    is_system:   true,
    slug_grants: [
      'assets:view','assets:create','assets:edit','assets:delete',
      'assets:assign','assets:return','assets:manage_categories',
      'assets:maintenance','assets:audit','assets:export',
      'settings:read','settings:write',
    ],
  },
  {
    name:        'Employee Self-Service',
    slug:        'employee_self',
    description: 'View own data, apply for leaves, request assets',
    color:       '#94a3b8',
    is_system:   true,
    slug_grants: [
      'employees:read',
      'leaves:read','leaves:write',
      'attendance:read',
      'assets:request',
    ],
  },
] as const;

// ─── PermissionGroup model ────────────────────────────────────────────────────

interface GroupAttrs {
  id:          number;
  company_id:  number;
  name:        string;
  slug:        string;
  description?: string | null;
  color?:      string | null;     // hex color for UI badge
  is_system:   boolean;           // system groups cannot be deleted
  is_active:   boolean;
  created_by?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export class PermissionGroup
  extends Model<GroupAttrs, Optional<GroupAttrs,'id'|'is_system'|'is_active'>>
  implements GroupAttrs
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
  // associations
  public permissions?: any[];
  public members?: any[];
}

PermissionGroup.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  name:        { type: DataTypes.STRING(150), allowNull: false },
  slug:        { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  color:       { type: DataTypes.STRING(20), allowNull: true, defaultValue: '#1e56d9' },
  is_system:   { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize,
  tableName:  'permission_groups',
  modelName:  'PermissionGroup',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  'updated_at',
  indexes: [{ unique: true, fields: ['company_id','slug'] }],
});

// ─── GroupPermission — join table: permission_group ↔ permissions ─────────────

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
  indexes: [{ unique: true, fields: ['group_id','permission_id'] }],
});

// ─── UserGroup — join table: user ↔ permission_group ─────────────────────────

export class UserGroup extends Model {
  public id!:         number;
  public user_id!:    number;
  public group_id!:   number;
  public company_id!: number;
  public assigned_by!:number | null;
  public readonly assigned_at!: Date;
}

UserGroup.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  user_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
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
    { unique: true, fields: ['user_id','group_id'] },
    { fields: ['company_id','group_id'] },
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────

// These will be added in models/index.ts (single source of truth)
// PermissionGroup ↔ Permission (via GroupPermission)
// PermissionGroup ↔ User (via UserGroup)
