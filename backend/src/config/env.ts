import dotenv from 'dotenv';
dotenv.config();

const requiredVars = [
  'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
];

requiredVars.forEach((v) => {
  if (!process.env[v]) throw new Error(`Missing required env var: ${v}`);
});

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  isProduction: process.env.NODE_ENV === 'production',

  db: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@nexhr.com',
    fromName: process.env.FROM_NAME || 'NexHR ERP',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
} as const;