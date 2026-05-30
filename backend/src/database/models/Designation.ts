import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface DesignationAttributes {
  id: number;
  company_id: number;
  department_id?: number | null;
  name: string;
  grade?: string | null;
  is_active: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface DesignationCreationAttributes
  extends Optional<DesignationAttributes, 'id' | 'is_active'> { }

export class Designation
  extends Model<DesignationAttributes, DesignationCreationAttributes>
  implements DesignationAttributes {
  public id!: number;
  public company_id!: number;
  public department_id!: number | null;
  public name!: string;
  public grade!: string | null;
  public is_active!: boolean;
  public created_by!: number | null;
  public updated_by!: number | null;

  public created_at!: Date;
  public updated_at!: Date;
  public deleted_at!: Date | null;
}

Designation.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    company_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },

    department_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    grade: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    created_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    updated_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'designations',
    modelName: 'Designation',

    timestamps: true,        // ✅ IMPORTANT
    paranoid: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      {
        fields: ['company_id']
      },
      {
        fields: ['department_id']
      },
      {
        unique: true,
        fields: ['company_id', 'name']
      }
    ]
  }
);