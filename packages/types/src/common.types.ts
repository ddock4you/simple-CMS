export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ListSnapshot<T> = PaginatedResponse<T>;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
