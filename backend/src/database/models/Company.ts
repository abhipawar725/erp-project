import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';


// ─── Attributes ───────────────────────────────────────────────────────────────

interface CompanyAttributes {
  id:                    number;
  name:                  string;
  slug:                  string | null;
  code:                  string | null;
  logo_url:              string | null;
  gstin:                 string | null;
  pan:                   string | null;
  phone:                 string | null;
  email:                 string | null;
  website:               string | null;
  address:               string | null;
  city:                  string | null;
  state:                 string | null;
  pincode:               string | null;
  country:               string;
  industry:              string | null;
  fiscal_year:           string;
  employee_count:        number;
  max_employees:         number;
  timezone:              string;
  currency:              string;
  date_format:           string;
  onboarding_step:       number;
  setup_completed_at:    Date | null;
  is_active:             boolean;
  notes:                 string | null;
  created_by:            number | null;
  created_at?:           Date;
  updated_at?:           Date;
  deleted_at?:           Date | null;
}

interface CompanyCreationAttributes extends Optional<CompanyAttributes,
  'id' | 'slug' | 'code' | 'logo_url' | 'gstin' | 'pan' | 'phone' | 'email' |
  'website' | 'address' | 'city' | 'state' | 'pincode' | 'industry' |
  'country' | 'fiscal_year' | 'employee_count' | 'max_employees' |
  'timezone' | 'currency' |
  'date_format' | 'onboarding_step' | 'setup_completed_at' | 'is_active' |
  'notes' | 'created_by'
> {}

export class Company
  extends Model<CompanyAttributes, CompanyCreationAttributes>
  implements CompanyAttributes
{
  public id!:                    number;
  public name!:                  string;
  public slug!:                  string | null;
  public code!:                  string | null;
  public logo_url!:              string | null;
  public gstin!:                 string | null;
  public pan!:                   string | null;
  public phone!:                 string | null;
  public email!:                 string | null;
  public website!:               string | null;
  public address!:               string | null;
  public city!:                  string | null;
  public state!:                 string | null;
  public pincode!:               string | null;
  public country!:               string;
  public industry!:              string | null;
  public fiscal_year!:           string;
  public employee_count!:        number;
  public max_employees!:         number;
  public timezone!:              string;
  public currency!:              string;
  public date_format!:           string;
  public onboarding_step!:       number;
  public setup_completed_at!:    Date | null;
  public is_active!:             boolean;
  public notes!:                 string | null;
  public created_by!:            number | null;
  public readonly created_at!:   Date;
  public readonly updated_at!:   Date;
  public readonly deleted_at!:   Date | null;
}

Company.init({
  id:                    { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name:                  { type: DataTypes.STRING(200), allowNull: false },
  slug:                  { type: DataTypes.STRING(100), allowNull: true, unique: true },
  code:                  { type: DataTypes.STRING(20),  allowNull: true, unique: true },
  logo_url:              { type: DataTypes.STRING(500), allowNull: true },
  gstin:                 { type: DataTypes.STRING(20),  allowNull: true },
  pan:                   { type: DataTypes.STRING(20),  allowNull: true },
  phone:                 { type: DataTypes.STRING(20),  allowNull: true },
  email:                 { type: DataTypes.STRING(255), allowNull: true },
  website:               { type: DataTypes.STRING(300), allowNull: true },
  address:               { type: DataTypes.TEXT, allowNull: true },
  city:                  { type: DataTypes.STRING(100), allowNull: true },
  state:                 { type: DataTypes.STRING(100), allowNull: true },
  pincode:               { type: DataTypes.STRING(10),  allowNull: true },
  country:               { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'India' },
  industry:              { type: DataTypes.STRING(100), allowNull: true },
  fiscal_year:           { type: DataTypes.STRING(10),  allowNull: false, defaultValue: 'Apr-Mar' },
  employee_count:        { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  max_employees:         { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 100 },
  timezone:              { type: DataTypes.STRING(100), defaultValue: 'Asia/Kolkata' },
  currency:              { type: DataTypes.STRING(10),  defaultValue: 'INR' },
  date_format:           { type: DataTypes.STRING(30),  defaultValue: 'DD/MM/YYYY' },
  onboarding_step:       { type: DataTypes.INTEGER,     defaultValue: 0 },
  setup_completed_at:    { type: DataTypes.DATE, allowNull: true },
  is_active:             { type: DataTypes.BOOLEAN, defaultValue: true },
  notes:                 { type: DataTypes.TEXT, allowNull: true },
  created_by:            { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize,
  tableName:  'companies',
  modelName:  'Company',
  paranoid:   true,
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  'updated_at',
  deletedAt:  'deleted_at',
  indexes: [
    { unique: true, fields: ['slug'] },
    { unique: true, fields: ['code'] },
    { fields: ['is_active'] },
  ],
});
