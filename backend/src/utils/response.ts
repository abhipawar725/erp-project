import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponseOptions {
  success?: boolean;
  message?: string;
  data?: unknown;
  errors?: unknown;
  meta?: PaginationMeta;
  statusCode?: number;
}

export function sendResponse(res: Response, options: ApiResponseOptions): Response {
  const {
    success = true,
    message = 'Success',
    data = null,
    errors = null,
    meta,
    statusCode = 200
  } = options;

  return res.status(statusCode).json({
    success,
    message,
    data,
    errors,
    ...(meta && { meta })
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors: errors || null
  });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = 'Data fetched successfully'
): Response {
  return res.status(200).json({
    success: true,
    message,
    data,
    errors: null,
    meta
  });
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
}

export function parsePaginationParams(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20), 10)));

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}