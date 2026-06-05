export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 0, message, data };
}

export function fail(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function parsePagination(query: { page?: string; pageSize?: string }): {
  page: number;
  pageSize: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(query.pageSize ?? '20', 10) || 20)
  );
  return { page, pageSize, skip: (page - 1) * pageSize };
}
