import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logDir = path.join(process.cwd(), 'src/logs');

const formats = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
);

const consoleFormat = winston.format.combine(
  formats,
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack }) =>
    `${timestamp} [${level}]: ${stack || message}`,
  ),
);

const fileFormat = winston.format.combine(formats, winston.format.json());

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      format: fileFormat,
    }),
    new DailyRotateFile({
      dirname: logDir,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: fileFormat,
    }),
  ],
});