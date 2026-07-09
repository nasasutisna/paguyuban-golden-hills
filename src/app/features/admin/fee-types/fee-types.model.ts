/**
 * Fee Types Data Models
 * Based on Swagger API specification
 */

/**
 * Fee Category enumeration
 */
export enum FeeCategory {
  MAINTENANCE = 'MAINTENANCE',
  UTILITIES = 'UTILITIES',
  SECURITY = 'SECURITY',
  OTHERS = 'OTHERS'
}

/**
 * Recurring Period enumeration
 */
export enum RecurringPeriod {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

/**
 * Fee Category display labels
 */
export const FEE_CATEGORY_LABELS: Record<FeeCategory, string> = {
  [FeeCategory.MAINTENANCE]: 'Pemeliharaan',
  [FeeCategory.UTILITIES]: 'Utilitas',
  [FeeCategory.SECURITY]: 'Keamanan',
  [FeeCategory.OTHERS]: 'Lainnya'
};

/**
 * Recurring Period display labels
 */
export const RECURRING_PERIOD_LABELS: Record<RecurringPeriod, string> = {
  [RecurringPeriod.MONTHLY]: 'Bulanan',
  [RecurringPeriod.QUARTERLY]: 'Triwulan',
  [RecurringPeriod.YEARLY]: 'Tahunan'
};

/**
 * Fee Category color mapping for badges
 */
export const FEE_CATEGORY_COLORS: Record<FeeCategory, string> = {
  [FeeCategory.MAINTENANCE]: 'primary',
  [FeeCategory.UTILITIES]: 'tertiary',
  [FeeCategory.SECURITY]: 'warning',
  [FeeCategory.OTHERS]: 'medium'
};

/**
 * Main Fee Type data model
 */
export interface FeeType {
  id: string;
  feeCode: string;
  feeName: string;
  description?: string;
  feeCategory: FeeCategory;
  isRecurring: boolean;
  recurrencePeriod?: RecurringPeriod;
  isTaxable: boolean;
  taxRate?: number;
  defaultAmount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Create Fee Type DTO
 */
export interface CreateFeeTypeDto {
  feeCode: string;
  feeName: string;
  description?: string;
  feeCategory: FeeCategory;
  isRecurring?: boolean;
  recurrencePeriod?: RecurringPeriod;
  isTaxable?: boolean;
  taxRate?: number;
  defaultAmount?: number;
  isActive?: boolean;
}

/**
 * Update Fee Type DTO (all fields optional)
 */
export interface UpdateFeeTypeDto {
  feeCode?: string;
  feeName?: string;
  description?: string;
  feeCategory?: FeeCategory;
  isRecurring?: boolean;
  recurrencePeriod?: RecurringPeriod;
  isTaxable?: boolean;
  taxRate?: number;
  defaultAmount?: number;
  isActive?: boolean;
}

/**
 * Pagination response wrapper
 */
export interface FeeTypeListResponse {
  data: FeeType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query parameters for list API
 */
export interface FeeTypeQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string;
  filters?: string;
  fields?: string;
}
