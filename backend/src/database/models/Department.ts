import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface DepartmentAttributes {
  id: number;
  company_id: number;
  name: string;
  code?: string | null;
  head_id?: number | null;
  parent_id?: number | null;
  is_active: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  deleted_by?: number | null;
}

interface DepartmentCreationAttributes extends Optional<DepartmentAttributes, 'id' | 'is_active'> {}

export class Department
  extends Model<DepartmentAttributes, DepartmentCreationAttributes>
  implements DepartmentAttributes
{
  public id!: number;
  public company_id!: number;
  public name!: string;
  public code!: string | null;
  public head_id!: number | null;
  public parent_id!: number | null;
  public is_active!: boolean;
  public created_by!: number | null;
  public updated_by!: number | null;
  public deleted_by!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
}

Department.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: true },
    head_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    parent_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    sequelize,
    tableName: 'departments',
    modelName: 'Department',
    paranoid: true,
    indexes: [{ fields: ['company_id'] }],
  },
);
