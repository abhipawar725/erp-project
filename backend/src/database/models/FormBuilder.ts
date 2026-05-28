import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── Field types ──────────────────────────────────────────────────────────────
export const FIELD_TYPES = [
  'text','email','number','password','textarea',
  'select','multi_select','radio','checkbox',
  'date','datetime','file','image',
  'phone','url','currency','percentage',
] as const;
export type FieldType = typeof FIELD_TYPES[number];

// ─── HrModule ─────────────────────────────────────────────────────────────────

interface ModuleAttrs {
  id: number; company_id: number; name: string; slug: string;
  icon?: string | null; description?: string | null;
  sort_order: number; is_active: boolean; is_system: boolean;
  created_at?: Date; updated_at?: Date;
}

export class HrModule
  extends Model<ModuleAttrs, Optional<ModuleAttrs,'id'|'sort_order'|'is_active'|'is_system'>>
  implements ModuleAttrs
{
  public id!: number;
  public company_id!: number;
  public name!: string;
  public slug!: string;
  public icon!: string | null;
  public description!: string | null;
  public sort_order!: number;
  public is_active!: boolean;
  public is_system!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  // associations
  public forms?: FormDefinition[];
}

HrModule.init({
  id:           { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  name:         { type: DataTypes.STRING(150), allowNull: false },
  slug:         { type: DataTypes.STRING(150), allowNull: false },
  icon:         { type: DataTypes.STRING(100), allowNull: true },
  description:  { type: DataTypes.TEXT, allowNull: true },
  sort_order:   { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
  is_system:    { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize, tableName: 'hr_modules', modelName: 'HrModule', timestamps: true,
  createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ unique: true, fields: ['company_id','slug'] }],
});

// ─── FormDefinition ───────────────────────────────────────────────────────────

interface FormDefAttrs {
  id: number; company_id: number; module_id: number;
  name: string; slug: string; description?: string | null;
  sort_order: number; is_active: boolean; is_system: boolean;
  created_by?: number | null; updated_by?: number | null;
  created_at?: Date; updated_at?: Date;
}

export class FormDefinition
  extends Model<FormDefAttrs, Optional<FormDefAttrs,'id'|'sort_order'|'is_active'|'is_system'>>
  implements FormDefAttrs
{
  public id!: number;
  public company_id!: number;
  public module_id!: number;
  public name!: string;
  public slug!: string;
  public description!: string | null;
  public sort_order!: number;
  public is_active!: boolean;
  public is_system!: boolean;
  public created_by!: number | null;
  public updated_by!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public fields?: DynamicField[];
}

FormDefinition.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  module_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  name:        { type: DataTypes.STRING(200), allowNull: false },
  slug:        { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  sort_order:  { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  is_system:   { type: DataTypes.BOOLEAN, defaultValue: false },
  created_by:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  updated_by:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize, tableName: 'form_definitions', modelName: 'FormDefinition', timestamps: true,
  createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ unique: true, fields: ['company_id','module_id','slug'] }],
});

// ─── DynamicField ─────────────────────────────────────────────────────────────

interface DynamicFieldAttrs {
  id: number; company_id: number; form_id: number;
  field_type: FieldType; label: string; field_key: string;
  placeholder?: string | null; help_text?: string | null;
  is_required: boolean; is_readonly: boolean; is_hidden: boolean;
  is_unique: boolean; is_active: boolean;
  default_value?: string | null; sort_order: number;
  // validation
  min_length?: number | null; max_length?: number | null;
  min_value?: number | null; max_value?: number | null;
  regex_pattern?: string | null; custom_validation?: string | null;
  // metadata
  section?: string | null;
  created_by?: number | null; updated_by?: number | null;
  created_at?: Date; updated_at?: Date;
}

export class DynamicField
  extends Model<DynamicFieldAttrs, Optional<DynamicFieldAttrs,'id'|'sort_order'|'is_required'|'is_readonly'|'is_hidden'|'is_unique'|'is_active'>>
  implements DynamicFieldAttrs
{
  public id!: number;
  public company_id!: number;
  public form_id!: number;
  public field_type!: FieldType;
  public label!: string;
  public field_key!: string;
  public placeholder!: string | null;
  public help_text!: string | null;
  public is_required!: boolean;
  public is_readonly!: boolean;
  public is_hidden!: boolean;
  public is_unique!: boolean;
  public is_active!: boolean;
  public default_value!: string | null;
  public sort_order!: number;
  public min_length!: number | null;
  public max_length!: number | null;
  public min_value!: number | null;
  public max_value!: number | null;
  public regex_pattern!: string | null;
  public custom_validation!: string | null;
  public section!: string | null;
  public created_by!: number | null;
  public updated_by!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public options?: FieldOption[];
  public permissions?: FieldPermissionV2[];
}

DynamicField.init({
  id:                { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  form_id:           { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  field_type:        { type: DataTypes.ENUM(...FIELD_TYPES), allowNull: false },
  label:             { type: DataTypes.STRING(200), allowNull: false },
  field_key:         { type: DataTypes.STRING(200), allowNull: false },
  placeholder:       { type: DataTypes.STRING(300), allowNull: true },
  help_text:         { type: DataTypes.STRING(500), allowNull: true },
  is_required:       { type: DataTypes.BOOLEAN, defaultValue: false },
  is_readonly:       { type: DataTypes.BOOLEAN, defaultValue: false },
  is_hidden:         { type: DataTypes.BOOLEAN, defaultValue: false },
  is_unique:         { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active:         { type: DataTypes.BOOLEAN, defaultValue: true },
  default_value:     { type: DataTypes.STRING(500), allowNull: true },
  sort_order:        { type: DataTypes.INTEGER, defaultValue: 0 },
  min_length:        { type: DataTypes.INTEGER, allowNull: true },
  max_length:        { type: DataTypes.INTEGER, allowNull: true },
  min_value:         { type: DataTypes.DECIMAL(20,4), allowNull: true },
  max_value:         { type: DataTypes.DECIMAL(20,4), allowNull: true },
  regex_pattern:     { type: DataTypes.STRING(500), allowNull: true },
  custom_validation: { type: DataTypes.TEXT, allowNull: true },
  section:           { type: DataTypes.STRING(100), allowNull: true },
  created_by:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  updated_by:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize, tableName: 'dynamic_fields', modelName: 'DynamicField', timestamps: true,
  createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['company_id','form_id','field_key'] },
    { fields: ['form_id','sort_order'] },
  ],
});

// ─── FieldOption ──────────────────────────────────────────────────────────────

interface FieldOptionAttrs {
  id: number; field_id: number; label: string; value: string;
  sort_order: number; is_active: boolean; is_default: boolean;
}

export class FieldOption
  extends Model<FieldOptionAttrs, Optional<FieldOptionAttrs,'id'|'sort_order'|'is_active'|'is_default'>>
  implements FieldOptionAttrs
{
  public id!: number;
  public field_id!: number;
  public label!: string;
  public value!: string;
  public sort_order!: number;
  public is_active!: boolean;
  public is_default!: boolean;
}

FieldOption.init({
  id:         { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  field_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  label:      { type: DataTypes.STRING(300), allowNull: false },
  value:      { type: DataTypes.STRING(300), allowNull: false },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
  is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize, tableName: 'field_options', modelName: 'FieldOption', timestamps: false,
  indexes: [{ fields: ['field_id'] }],
});

// ─── FieldPermissionV2 — field-level RBAC keyed to DynamicField ───────────────

interface FPV2Attrs {
  id: number; role_id: number; field_id: number; company_id: number;
  can_view: boolean; can_edit: boolean; can_copy: boolean;
  can_download: boolean; is_masked: boolean;
}

export class FieldPermissionV2
  extends Model<FPV2Attrs, Optional<FPV2Attrs,'id'|'can_view'|'can_edit'|'can_copy'|'can_download'|'is_masked'>>
  implements FPV2Attrs
{
  public id!: number;
  public role_id!: number;
  public field_id!: number;
  public company_id!: number;
  public can_view!: boolean;
  public can_edit!: boolean;
  public can_copy!: boolean;
  public can_download!: boolean;
  public is_masked!: boolean;
}

FieldPermissionV2.init({
  id:           { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  role_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  field_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  company_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  can_view:     { type: DataTypes.BOOLEAN, defaultValue: true },
  can_edit:     { type: DataTypes.BOOLEAN, defaultValue: false },
  can_copy:     { type: DataTypes.BOOLEAN, defaultValue: false },
  can_download: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_masked:    { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize, tableName: 'field_permissions_v2', modelName: 'FieldPermissionV2', timestamps: false,
  indexes: [
    { unique: true, fields: ['role_id','field_id'] },
    { fields: ['company_id','role_id'] },
  ],
});

// ─── RoleAssignment — many-to-many: User/Employee → Role ──────────────────────

export class RoleAssignment extends Model {
  public id!: number;
  public role_id!: number;
  public user_id!: number;    // FK to users table
  public company_id!: number;
  public assigned_by!: number | null;
  public readonly assigned_at!: Date;
}

RoleAssignment.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  role_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  user_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  company_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  assigned_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  assigned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize, tableName: 'role_assignments', modelName: 'RoleAssignment', timestamps: false,
  indexes: [
    { unique: true, fields: ['role_id','user_id'] },
    { fields: ['company_id','user_id'] },
  ],
});