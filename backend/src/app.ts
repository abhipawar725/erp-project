import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { env } from './config/env';
import { logger } from './config/logger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';

const app = express();

// ─── Security ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.cors.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ───────────────────────────────────────────
const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  message: { success: false, message: 'Too many requests, please try again later.', data: null },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Auth endpoints: stricter rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { success: false, message: 'Too many login attempts.', data: null },
});
app.use('/api/auth/login', authLimiter);

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ─── Request Logging ─────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (_req, res) => res.statusCode < 400 && env.isProduction,
}));

// ─── Static Files ────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), env.upload.dir)));

// ─── API Routes ──────────────────────────────────────────────
app.use('/api', routes);

// ─── Error Handling ──────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;