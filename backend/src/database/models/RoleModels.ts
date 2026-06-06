import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── Role ─────────────────────────────────────────────────────────────────────

interface RoleAttributes {
  id:           number;
  company_id:   number;
  name:         string;
  slug:         string;
  description?: string | null;
  is_system:    boolean;
  template_id?: number | null;   // ← added: links back to global role_templates
}

export class Role
  extends Model<RoleAttributes, Optional<RoleAttributes, 'id' | 'is_system' | 'template_id'>>
  implements RoleAttributes
{
  public id!:           number;
  public company_id!:   number;
  public name!:         string;
  public slug!:         string;
  public description!:  string | null;
  public is_system!:    boolean;
  public template_id!:  number | null;   // ← added
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  // associations
  public permissions?: RolePermission[];
}

Role.init(
  {
    id:           { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name:         { type: DataTypes.STRING(100), allowNull: false },
    slug:         { type: DataTypes.STRING(100), allowNull: false },
    description:  { type: DataTypes.TEXT, allowNull: true },
    is_system:    { type: DataTypes.BOOLEAN, defaultValue: false },
    template_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },  // ← added
  },
  {
    sequelize,
    tableName:  'roles',
    modelName:  'Role',
    paranoid:   true,
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
    deletedAt:  'deleted_at',
    indexes: [{ unique: true, fields: ['company_id', 'slug'] }],
  },
);

// ─── Permission (slug-based global list) ──────────────────────────────────────

interface PermissionAttributes {
  id:           number;
  module:       string;
  action:       string;
  slug:         string;
  description?: string | null;
}

export class Permission
  extends Model<PermissionAttributes, Optional<PermissionAttributes, 'id'>>
  implements PermissionAttributes
{
  public id!:          number;
  public module!:      string;
  public action!:      string;
  public slug!:        string;
  public description!: string | null;
}

Permission.init(
  {
    id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    module:      { type: DataTypes.STRING(100), allowNull: false },
    action:      { type: DataTypes.STRING(100), allowNull: false },
    slug:        { type: DataTypes.STRING(200), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(300), allowNull: true },
  },
  { sequelize, tableName: 'permissions', modelName: 'Permission', timestamps: false },
);

// ─── FieldPermission (role × field masking) ───────────────────────────────────

interface FieldPermissionAttributes {
  id:           number;
  role_id:      number;
  module:       string;
  field_name:   string;
  can_view:     boolean;
  can_edit:     boolean;
  can_delete:    boolean;
  can_download: boolean;
  is_masked:    boolean;
}

export class FieldPermission
  extends Model<FieldPermissionAttributes, Optional<FieldPermissionAttributes,
    'id' | 'can_view' | 'can_edit' | 'can_delete' | 'can_download' | 'is_masked'>>
  implements FieldPermissionAttributes
{
  public id!:           number;
  public role_id!:      number;
  public module!:       string;
  public field_name!:   string;
  public can_view!:     boolean;
  public can_edit!:     boolean;
  public can_delete!:    boolean;
  public can_download!: boolean;
  public can_copy!:     boolean;
  public is_masked!:    boolean;
}

FieldPermission.init(
  {
    id:           { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    role_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    module:       { type: DataTypes.STRING(100), allowNull: false },
    field_name:   { type: DataTypes.STRING(200), allowNull: false },
    can_view:     { type: DataTypes.BOOLEAN, defaultValue: true },
    can_edit:     { type: DataTypes.BOOLEAN, defaultValue: false },
    can_delete:    { type: DataTypes.BOOLEAN, defaultValue: false },
    can_download: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_masked:    { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    tableName:  'field_permissions',
    modelName:  'FieldPermission',
    timestamps: false,
    indexes: [{ unique: true, fields: ['role_id', 'module', 'field_name'] }],
  },
);

// ─── RolePermission — join: role ↔ permission slug ───────────────────────────
// This is the existing slug-based join (role_id + permission_id → permissions.slug)

export class RolePermission extends Model {
  public id!:            number;
  public role_id!:       number;
  public permission_id!: number;
}

RolePermission.init(
  {
    id:            { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    role_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    permission_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  {
    sequelize,
    tableName:  'role_permissions',
    modelName:  'RolePermission',
    timestamps: false,
    indexes: [{ unique: true, fields: ['role_id', 'permission_id'] }],
  },
);

// ─── RoleModulePermission — module-level CRUD flags (for new template system) ─
// Separate table from slug-based RolePermission above.
// Used by the seeder when copying from role_template_permissions.

interface RoleModulePermAttr {
  id:           number;
  role_id:      number;
  module:       string;
  can_view:     boolean;
  can_edit:     boolean;
  can_delete:   boolean;
  can_download:   boolean;
  can_mask:  boolean;
}

export class RoleModulePermission
  extends Model<RoleModulePermAttr, Optional<RoleModulePermAttr,
    'id'|'can_view'|'can_edit'|'can_delete'|'can_download'|'can_mask'>>
  implements RoleModulePermAttr
{
  public id!:          number;
  public role_id!:     number;
  public module!:      string;
  public can_view!:    boolean;
  public can_edit!:    boolean;
  public can_delete!:  boolean;
  public can_download!:  boolean;
  public can_mask!: boolean;
}

RoleModulePermission.init(
  {
    id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    role_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    module:      { type: DataTypes.STRING(100), allowNull: false },
    can_view:    { type: DataTypes.BOOLEAN, defaultValue: false },
    can_edit:    { type: DataTypes.BOOLEAN, defaultValue: false },
    can_delete:  { type: DataTypes.BOOLEAN, defaultValue: false },
    can_download:  { type: DataTypes.BOOLEAN, defaultValue: false },
    can_mask: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    tableName:  'role_module_permissions',
    modelName:  'RoleModulePermission',
    timestamps: false,
    indexes: [{ unique: true, fields: ['role_id', 'module'] }],
  },
);
