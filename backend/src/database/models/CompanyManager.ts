import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface CompanyManagerAttrs {
  id:           number;
  company_id:   number;
  employee_id:  number;
  role:         'owner' | 'admin' | 'manager';
  is_primary:   boolean;
  assigned_by:  number | null;
  assigned_at:  Date;
  notes:        string | null;
}

export class CompanyManager
  extends Model<CompanyManagerAttrs,
    Optional<CompanyManagerAttrs, 'id' | 'role' | 'is_primary' | 'assigned_by' | 'assigned_at' | 'notes'>>
  implements CompanyManagerAttrs
{
  public id!:           number;
  public company_id!:   number;
  public employee_id!:  number;
  public role!:         'owner' | 'admin' | 'manager';
  public is_primary!:   boolean;
  public assigned_by!:  number | null;
  public readonly assigned_at!: Date;
  public notes!:        string | null;

  // Populated by associations
  public employee?: any;
  public company?:  any;
}

CompanyManager.init({
  id:          { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  company_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  role: {
    type:         DataTypes.ENUM('owner', 'admin', 'manager'),
    defaultValue: 'manager',
    comment:      'owner=full control, admin=can create employees, manager=view only',
  },
  is_primary:  { type: DataTypes.BOOLEAN, defaultValue: false },
  assigned_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  assigned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  notes:       { type: DataTypes.STRING(500), allowNull: true },
}, {
  sequelize,
  tableName:  'company_managers',
  modelName:  'CompanyManager',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['company_id', 'employee_id'] },
    { fields: ['employee_id'] },
    { fields: ['company_id', 'is_primary'] },
  ],
});
