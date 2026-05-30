import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface UserAttributes {
  id:             number;
  company_id:     number;
  employee_id?:   number | null;
  email:          string;
  password_hash:  string;
  role_id:        number;
  is_super_admin: boolean;   // ← bypasses ALL tenant + permission checks
  is_active:      boolean;
  last_login_at?: Date | null;
  refresh_token?: string | null;
  reset_token?:   string | null;
  reset_expires?: Date | null;
  created_by?:    number | null;
  updated_by?:    number | null;
  deleted_by?:    number | null;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'is_active' | 'is_super_admin'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!:             number;
  public company_id!:     number;
  public employee_id!:    number | null;
  public email!:          string;
  public password_hash!:  string;
  public role_id!:        number;
  public is_super_admin!: boolean;
  public is_active!:      boolean;
  public last_login_at!:  Date | null;
  public refresh_token!:  string | null;
  public reset_token!:    string | null;
  public reset_expires!:  Date | null;
  public created_by!:     number | null;
  public updated_by!:     number | null;
  public deleted_by!:     number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
}

User.init({
  id:             { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  employee_id:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  email:          { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  password_hash:  { type: DataTypes.STRING(255), allowNull: false },
  role_id:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  is_super_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active:      { type: DataTypes.BOOLEAN, defaultValue: true },
  last_login_at:  { type: DataTypes.DATE, allowNull: true },
  refresh_token:  { type: DataTypes.TEXT, allowNull: true },
  reset_token:    { type: DataTypes.STRING(255), allowNull: true },
  reset_expires:  { type: DataTypes.DATE, allowNull: true },
  created_by:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  updated_by:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  deleted_by:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize,
  tableName:  'users',
  modelName:  'User',
  paranoid:   true,
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  'updated_at',
  deletedAt:  'deleted_at',
  indexes: [
    { unique: true, fields: ['email'] },
    { fields: ['company_id'] },
    { fields: ['is_super_admin'] },
  ],
});
