import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface NotificationAttributes {
  id: number;
  company_id: number;
  user_id?: number | null;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  read_at?: Date | null;
}

export class Notification
  extends Model<NotificationAttributes, Optional<NotificationAttributes, 'id' | 'is_read'>>
  implements NotificationAttributes
{
  public id!: number;
  public company_id!: number;
  public user_id!: number | null;
  public type!: string | null;
  public title!: string | null;
  public body!: string | null;
  public link!: string | null;
  public is_read!: boolean;
  public read_at!: Date | null;
  public readonly created_at!: Date;
}

Notification.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    type: { type: DataTypes.STRING(100), allowNull: true },
    title: { type: DataTypes.STRING(300), allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: true },
    link: { type: DataTypes.STRING(500), allowNull: true },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
    read_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'notifications',
    modelName: 'Notification',
    updatedAt: false,
    indexes: [{ fields: ['user_id'] }, { fields: ['user_id', 'is_read'] }],
  },
);
