// ═══ Standard API Response Wrapper ═══
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors?: Array<{ field: string; message: string }> | null;
  meta?: PaginationMeta;
}

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

// ═══ Common query params ═══
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}