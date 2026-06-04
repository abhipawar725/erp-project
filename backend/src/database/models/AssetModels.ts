import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ASSET_STATUSES = [
  'available','assigned','in_repair','lost','damaged',
  'scrapped','reserved','under_maintenance',
] as const;
export type AssetStatus = typeof ASSET_STATUSES[number];

export const ASSET_CONDITIONS = ['excellent','good','fair','poor','damaged'] as const;
export type AssetCondition = typeof ASSET_CONDITIONS[number];

export const REQUEST_STATUSES = ['pending','approved','rejected','cancelled','fulfilled'] as const;
export const APPROVAL_STATUSES = ['pending','approved','rejected'] as const;
export const MAINTENANCE_TYPES = ['repair','service','inspection','upgrade','calibration'] as const;
export const DEPRECIATION_TYPES = ['straight_line','declining_balance','units_of_production','none'] as const;

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  available:         'Available',
  assigned:          'Assigned',
  in_repair:         'In Repair',
  lost:              'Lost',
  damaged:           'Damaged',
  scrapped:          'Scrapped',
  reserved:          'Reserved',
  under_maintenance: 'Under Maintenance',
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, { bg: string; text: string }> = {
  available:         { bg: '#ecfdf5', text: '#0d9669' },
  assigned:          { bg: '#eef3fd', text: '#1e56d9' },
  in_repair:         { bg: '#fff8ed', text: '#c96f00' },
  lost:              { bg: '#fef2f2', text: '#cc2a2a' },
  damaged:           { bg: '#fef2f2', text: '#cc2a2a' },
  scrapped:          { bg: '#f1f3f6', text: '#64748b' },
  reserved:          { bg: '#f4f0ff', text: '#6c31d9' },
  under_maintenance: { bg: '#fff8ed', text: '#c96f00' },
};

// ─── AssetCategory ────────────────────────────────────────────────────────────

interface CatAttrs {
  id: number; company_id: number;
  name: string; slug: string; prefix: string;
  parent_id?: number | null; icon?: string | null;
  description?: string | null;
  depreciation_type: string; depreciation_rate?: number | null;
  useful_life_months?: number | null;
  custom_fields?: Record<string, unknown> | null;
  is_active: boolean; sort_order: number;
  created_by?: number | null;
  created_at?: Date; updated_at?: Date; deleted_at?: Date | null;
}

export class AssetCategory
  extends Model<CatAttrs, Optional<CatAttrs,'id'|'is_active'|'sort_order'>>
  implements CatAttrs
{
  public id!:                   number;
  public company_id!:           number;
  public name!:                 string;
  public slug!:                 string;
  public prefix!:               string;
  public parent_id!:            number | null;
  public icon!:                 string | null;
  public description!:          string | null;
  public depreciation_type!:    string;
  public depreciation_rate!:    number | null;
  public useful_life_months!:   number | null;
  public custom_fields!:        Record<string, unknown> | null;
  public is_active!:            boolean;
  public sort_order!:           number;
  public created_by!:           number | null;
  public readonly created_at!:  Date;
  public readonly updated_at!:  Date;
  public readonly deleted_at!:  Date | null;
  // associations
  public children?: AssetCategory[];
  public parent?: AssetCategory;
}

AssetCategory.init({
  id:                  { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:          { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  name:                { type: DataTypes.STRING(150), allowNull: false },
  slug:                { type: DataTypes.STRING(150), allowNull: false },
  prefix:              { type: DataTypes.STRING(10),  allowNull: false, defaultValue: 'AST' },
  parent_id:           { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  icon:                { type: DataTypes.STRING(50),  allowNull: true },
  description:         { type: DataTypes.TEXT, allowNull: true },
  depreciation_type:   { type: DataTypes.ENUM(...DEPRECIATION_TYPES), defaultValue: 'straight_line' },
  depreciation_rate:   { type: DataTypes.DECIMAL(5,2), allowNull: true },
  useful_life_months:  { type: DataTypes.INTEGER, allowNull: true },
  custom_fields:       { type: DataTypes.JSON, allowNull: true },
  is_active:           { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order:          { type: DataTypes.INTEGER, defaultValue: 0 },
  created_by:          { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize, tableName: 'asset_categories', modelName: 'AssetCategory',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  paranoid: true, deletedAt: 'deleted_at',
  indexes: [{ unique: true, fields: ['company_id','slug'] }, { fields: ['company_id','is_active'] }],
});

// ─── Asset ────────────────────────────────────────────────────────────────────

interface AssetAttrs {
  id: number; company_id: number;
  asset_code: string;      // auto-generated, e.g. LAP-2024-001
  name: string; category_id: number;
  brand?: string | null; model?: string | null; serial_number?: string | null;
  barcode?: string | null; qr_code?: string | null;
  purchase_date?: Date | null; purchase_cost?: number | null; vendor?: string | null;
  warranty_expiry?: Date | null; warranty_notes?: string | null;
  condition: AssetCondition; status: AssetStatus;
  location?: string | null; branch?: string | null; department_id?: number | null;
  description?: string | null; notes?: string | null;
  custom_fields?: Record<string, unknown> | null;
  // Depreciation
  current_value?: number | null;
  // Meta
  created_by?: number | null; updated_by?: number | null;
  created_at?: Date; updated_at?: Date; deleted_at?: Date | null;
}

export class Asset
  extends Model<AssetAttrs, Optional<AssetAttrs,'id'|'condition'|'status'>>
  implements AssetAttrs
{
  public id!:                number;
  public company_id!:        number;
  public asset_code!:        string;
  public name!:              string;
  public category_id!:       number;
  public brand!:             string | null;
  public model!:             string | null;
  public serial_number!:     string | null;
  public barcode!:           string | null;
  public qr_code!:           string | null;
  public purchase_date!:     Date | null;
  public purchase_cost!:     number | null;
  public vendor!:            string | null;
  public warranty_expiry!:   Date | null;
  public warranty_notes!:    string | null;
  public condition!:         AssetCondition;
  public status!:            AssetStatus;
  public location!:          string | null;
  public branch!:            string | null;
  public department_id!:     number | null;
  public description!:       string | null;
  public notes!:             string | null;
  public custom_fields!:     Record<string, unknown> | null;
  public current_value!:     number | null;
  public created_by!:        number | null;
  public updated_by!:        number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
  // associations
  public category?: AssetCategory;
  public currentAssignment?: AssetAssignment;
  public assignments?: AssetAssignment[];
}

Asset.init({
  id:            { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  asset_code:    { type: DataTypes.STRING(50), allowNull: false },
  name:          { type: DataTypes.STRING(200), allowNull: false },
  category_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  brand:         { type: DataTypes.STRING(100), allowNull: true },
  model:         { type: DataTypes.STRING(100), allowNull: true },
  serial_number: { type: DataTypes.STRING(100), allowNull: true },
  barcode:       { type: DataTypes.STRING(100), allowNull: true },
  qr_code:       { type: DataTypes.STRING(500), allowNull: true },
  purchase_date: { type: DataTypes.DATEONLY, allowNull: true },
  purchase_cost: { type: DataTypes.DECIMAL(14,2), allowNull: true },
  vendor:        { type: DataTypes.STRING(200), allowNull: true },
  warranty_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  warranty_notes:  { type: DataTypes.TEXT, allowNull: true },
  condition:     { type: DataTypes.ENUM(...ASSET_CONDITIONS), defaultValue: 'good' },
  status:        { type: DataTypes.ENUM(...ASSET_STATUSES), defaultValue: 'available' },
  location:      { type: DataTypes.STRING(200), allowNull: true },
  branch:        { type: DataTypes.STRING(100), allowNull: true },
  department_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  description:   { type: DataTypes.TEXT, allowNull: true },
  notes:         { type: DataTypes.TEXT, allowNull: true },
  custom_fields: { type: DataTypes.JSON, allowNull: true },
  current_value: { type: DataTypes.DECIMAL(14,2), allowNull: true },
  created_by:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  updated_by:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize, tableName: 'assets', modelName: 'Asset',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  paranoid: true, deletedAt: 'deleted_at',
  indexes: [
    { unique: true, fields: ['company_id','asset_code'] },
    { fields: ['company_id','status'] },
    { fields: ['company_id','category_id'] },
    { fields: ['warranty_expiry'] },
  ],
});

// ─── AssetAssignment ──────────────────────────────────────────────────────────

interface AssignAttrs {
  id: number; company_id: number; asset_id: number; employee_id: number;
  assigned_by: number; approved_by?: number | null;
  assignment_date: Date; expected_return_date?: Date | null; actual_return_date?: Date | null;
  is_temporary: boolean; is_active: boolean;
  condition_before: AssetCondition; condition_after?: AssetCondition | null;
  return_notes?: string | null; damage_notes?: string | null;
  remarks?: string | null; acknowledgement_url?: string | null;
  created_at?: Date; updated_at?: Date;
}

export class AssetAssignment
  extends Model<AssignAttrs, Optional<AssignAttrs,'id'|'is_temporary'|'is_active'|'condition_before'>>
  implements AssignAttrs
{
  public id!:                    number;
  public company_id!:            number;
  public asset_id!:              number;
  public employee_id!:           number;
  public assigned_by!:           number;
  public approved_by!:           number | null;
  public assignment_date!:       Date;
  public expected_return_date!:  Date | null;
  public actual_return_date!:    Date | null;
  public is_temporary!:          boolean;
  public is_active!:             boolean;
  public condition_before!:      AssetCondition;
  public condition_after!:       AssetCondition | null;
  public return_notes!:          string | null;
  public damage_notes!:          string | null;
  public remarks!:               string | null;
  public acknowledgement_url!:   string | null;
  public readonly created_at!:   Date;
  public readonly updated_at!:   Date;
  // associations
  public asset?: Asset;
  public employee?: any;
}

AssetAssignment.init({
  id:                   { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:           { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  asset_id:             { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  employee_id:          { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  assigned_by:          { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  approved_by:          { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  assignment_date:      { type: DataTypes.DATEONLY, allowNull: false },
  expected_return_date: { type: DataTypes.DATEONLY, allowNull: true },
  actual_return_date:   { type: DataTypes.DATEONLY, allowNull: true },
  is_temporary:         { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active:            { type: DataTypes.BOOLEAN, defaultValue: true },
  condition_before:     { type: DataTypes.ENUM(...ASSET_CONDITIONS), defaultValue: 'good' },
  condition_after:      { type: DataTypes.ENUM(...ASSET_CONDITIONS), allowNull: true },
  return_notes:         { type: DataTypes.TEXT, allowNull: true },
  damage_notes:         { type: DataTypes.TEXT, allowNull: true },
  remarks:              { type: DataTypes.TEXT, allowNull: true },
  acknowledgement_url:  { type: DataTypes.STRING(500), allowNull: true },
}, {
  sequelize, tableName: 'asset_assignments', modelName: 'AssetAssignment',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [
    { fields: ['company_id','asset_id','is_active'] },
    { fields: ['company_id','employee_id'] },
  ],
});

// ─── AssetRequest ─────────────────────────────────────────────────────────────

export class AssetRequest extends Model {
  public id!:           number;
  public company_id!:   number;
  public employee_id!:  number;
  public category_id!:  number | null;
  public asset_id!:     number | null;   // specific asset (replacement/repair)
  public request_type!: string;          // new|replacement|repair|return|software
  public reason!:       string;
  public urgency!:      string;          // low|medium|high|critical
  public status!:       string;
  public approved_by!:  number | null;
  public approved_at!:  Date | null;
  public rejection_reason!: string | null;
  public fulfilled_asset_id!: number | null;
  public notes!:        string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  // associations
  public employee?: any; category?: AssetCategory; asset?: Asset;
}

AssetRequest.init({
  id:                { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  employee_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  category_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  asset_id:          { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  request_type:      { type: DataTypes.ENUM('new','replacement','repair','return','software'), defaultValue: 'new' },
  reason:            { type: DataTypes.TEXT, allowNull: false },
  urgency:           { type: DataTypes.ENUM('low','medium','high','critical'), defaultValue: 'medium' },
  status:            { type: DataTypes.ENUM(...REQUEST_STATUSES), defaultValue: 'pending' },
  approved_by:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  approved_at:       { type: DataTypes.DATE, allowNull: true },
  rejection_reason:  { type: DataTypes.TEXT, allowNull: true },
  fulfilled_asset_id:{ type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  notes:             { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize, tableName: 'asset_requests', modelName: 'AssetRequest',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['company_id','status'] }, { fields: ['employee_id'] }],
});

// ─── AssetMaintenance ─────────────────────────────────────────────────────────

export class AssetMaintenance extends Model {
  public id!:               number;
  public company_id!:       number;
  public asset_id!:         number;
  public maintenance_type!: string;
  public description!:      string;
  public vendor!:           string | null;
  public cost!:             number | null;
  public scheduled_date!:   Date | null;
  public start_date!:       Date | null;
  public end_date!:         Date | null;
  public status!:           string;
  public notes!:            string | null;
  public created_by!:       number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public asset?: Asset;
}

AssetMaintenance.init({
  id:               { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  asset_id:         { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  maintenance_type: { type: DataTypes.ENUM(...MAINTENANCE_TYPES), defaultValue: 'service' },
  description:      { type: DataTypes.TEXT, allowNull: false },
  vendor:           { type: DataTypes.STRING(200), allowNull: true },
  cost:             { type: DataTypes.DECIMAL(14,2), allowNull: true },
  scheduled_date:   { type: DataTypes.DATEONLY, allowNull: true },
  start_date:       { type: DataTypes.DATEONLY, allowNull: true },
  end_date:         { type: DataTypes.DATEONLY, allowNull: true },
  status:           { type: DataTypes.ENUM('scheduled','in_progress','completed','cancelled'), defaultValue: 'scheduled' },
  notes:            { type: DataTypes.TEXT, allowNull: true },
  created_by:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize, tableName: 'asset_maintenance', modelName: 'AssetMaintenance',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['company_id','asset_id'] }, { fields: ['status'] }],
});

// ─── Associations ─────────────────────────────────────────────────────────────

AssetCategory.hasMany(AssetCategory, { foreignKey: 'parent_id', as: 'children' });
AssetCategory.belongsTo(AssetCategory, { foreignKey: 'parent_id', as: 'parent' });
AssetCategory.hasMany(Asset, { foreignKey: 'category_id', as: 'assets' });
Asset.belongsTo(AssetCategory, { foreignKey: 'category_id', as: 'category' });

Asset.hasMany(AssetAssignment,    { foreignKey: 'asset_id', as: 'assignments' });
AssetAssignment.belongsTo(Asset,  { foreignKey: 'asset_id', as: 'asset' });

Asset.hasMany(AssetMaintenance,         { foreignKey: 'asset_id', as: 'maintenanceRecords' });
AssetMaintenance.belongsTo(Asset,       { foreignKey: 'asset_id', as: 'asset' });

AssetRequest.belongsTo(AssetCategory,   { foreignKey: 'category_id', as: 'category' });
AssetRequest.belongsTo(Asset,           { foreignKey: 'asset_id',    as: 'asset' });
