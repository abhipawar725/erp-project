import { Sequelize } from 'sequelize';
import { env } from './env';
import { logger } from './logger';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  timezone: '+05:30', // IST
  logging: false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
});

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');
    // In dev: sync without force (use migrations in prod)
    if (env.nodeEnv === 'development') {
      await sequelize.sync();
    }
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
}