import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── OtpRequest — audit log for rate limiting ─────────────────────────────────

export class OtpRequest extends Model {
  public id!:          number;
  public employee_id!: number;
  public channel!:     'email' | 'sms';
  public ip_address!:  string | null;
  public expires_at!:  Date;
  public used_at!:     Date | null;
  public readonly requested_at!: Date;
}

OtpRequest.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  channel:     { type: DataTypes.ENUM('email','sms'), defaultValue: 'email' },
  ip_address:  { type: DataTypes.STRING(50), allowNull: true },
  expires_at:  { type: DataTypes.DATE, allowNull: false },
  used_at:     { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize, tableName: 'otp_requests', modelName: 'OtpRequest',
  timestamps: true, createdAt: 'requested_at', updatedAt: false,
  indexes: [{ fields: ['employee_id','requested_at'] }],
});

// ─── EmployeeRole — many-to-many: employee ↔ roles ────────────────────────────

export class EmployeeRole extends Model {
  public id!:          number;
  public employee_id!: number;
  public role_id!:     number;
  public company_id!:  number;
  public assigned_by!: number | null;
  public readonly assigned_at!: Date;
}

EmployeeRole.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  role_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  company_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  assigned_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  assigned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize, tableName: 'employee_roles', modelName: 'EmployeeRole',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['employee_id','role_id'] },
    { fields: ['company_id','role_id'] },
  ],
});

// ─── RoleTemplate — global, seeded once ───────────────────────────────────────

export class RoleTemplate extends Model {
  public id!:          number;
  public slug!:        string;
  public name!:        string;
  public description!: string | null;
  public is_system!:   boolean;
  public sort_order!:  number;
}

RoleTemplate.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  slug:        { type: DataTypes.STRING(100), allowNull: false, unique: true },
  name:        { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  is_system:   { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order:  { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  sequelize, tableName: 'role_templates', modelName: 'RoleTemplate',
  timestamps: true, createdAt: 'created_at', updatedAt: false,
});

// ─── RoleTemplatePermission ────────────────────────────────────────────────────

export class RoleTemplatePermission extends Model {
  public id!:          number;
  public template_id!: number;
  public module!:      string;
  public can_view!:    boolean;
  public can_create!:    boolean;  
  public can_edit!:    boolean;
  public can_delete!:  boolean;
  public can_download!:  boolean;
}

RoleTemplatePermission.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  template_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  module:      { type: DataTypes.STRING(100), allowNull: false },
  can_view:    { type: DataTypes.BOOLEAN, defaultValue: false },
  can_create:    { type: DataTypes.BOOLEAN, defaultValue: false },
  can_edit:    { type: DataTypes.BOOLEAN, defaultValue: false },
  can_delete:  { type: DataTypes.BOOLEAN, defaultValue: false },
  can_download:  { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize, tableName: 'role_template_permissions', modelName: 'RoleTemplatePermission',
  timestamps: false,
  indexes: [{ unique: true, fields: ['template_id','module'] }],
});
