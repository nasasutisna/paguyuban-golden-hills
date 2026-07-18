/**
 * Employee Positions Data Models
 * Lookup/master data for positions (used as dropdown source in employee form).
 * Based on backend employee-positions module.
 */

/**
 * Employee Position master record
 */
export interface EmployeePosition {
  id: string;
  positionCode: string;
  positionName: string;
  department?: string;
  description?: string;
  salaryGrade?: string;
  level?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Pagination response wrapper
 */
export interface EmployeePositionListResponse {
  data: EmployeePosition[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query parameters for list API
 */
export interface EmployeePositionQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string;
  filters?: string; // JSON string
}
