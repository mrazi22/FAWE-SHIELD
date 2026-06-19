export type ApiErrorResponse = {
  message?: string;
  error?: string;
  code?: string;
  sqlMessage?: string;
};

export type PaginatedResponse<T> = {
  page: number;
  limit: number;
  total: number;
  count: number;
  data: T[];
};