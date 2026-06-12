import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface EmployeePermissionAttributes {
    id: number;
    company_id: number;
    employee_id: number;
    permission_id: number;
    type: 'grant' | 'revoke';
    created_by?: number | null;
}

interface EmployeePermissionCreationAttributes extends Optional<EmployeePermissionAttributes, 'id'> { }

export class EmployeePermission
    extends Model<EmployeePermissionAttributes, EmployeePermissionCreationAttributes>
    implements EmployeePermissionAttributes {
    public id!: number;
    public company_id!: number;
    public employee_id!: number;
    public permission_id!: number;
    public type!: 'grant' | 'revoke';
    public created_by!: number | null;
}

EmployeePermission.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    permission_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM('grant', 'revoke'), allowNull: false },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
},
    {
        sequelize,
        tableName: 'employee_permissions',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['employee_id', 'permission_id'] }
        ]
    })