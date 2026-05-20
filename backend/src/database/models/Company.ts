import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── Attributes Interface ─────────────────────────────────────────────────────

interface CompanyAttributes {
  id: number;
  name: string;
  code?: string | null;
  logo_url?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country: string;
  fiscal_year: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

// Fields optional on create
interface CompanyCreationAttributes
  extends Optional<CompanyAttributes, 'id' | 'country' | 'fiscal_year' | 'is_active'> {}

// ─── Model Class ──────────────────────────────────────────────────────────────

export class Company
  extends Model<CompanyAttributes, CompanyCreationAttributes>
  implements CompanyAttributes
{
  public id!: number;
  public name!: string;
  public code!: string | null;
  public logo_url!: string | null;
  public gstin!: string | null;
  public pan!: string | null;
  public address!: string | null;
  public city!: string | null;
  public state!: string | null;
  public pincode!: string | null;
  public country!: string;
  public fiscal_year!: string;
  public is_active!: boolean;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

Company.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Company name is required' },
        len: { args: [2, 200], msg: 'Company name must be between 2 and 200 characters' },
      },
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    gstin: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    pan: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'India',
    },
    fiscal_year: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'Apr-Mar',
      validate: {
        isIn: {
          args: [['Apr-Mar', 'Jan-Dec', 'Jul-Jun']],
          msg: 'fiscal_year must be one of: Apr-Mar, Jan-Dec, Jul-Jun',
        },
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'companies',
    modelName: 'Company',

    // Soft delete support
    paranoid: true,

    // Timestamps: created_at, updated_at, deleted_at
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',

    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['is_active'] },
    ],
  },
);