/**
 * Table Component Models
 * Standardized interfaces for reusable table component
 */

/**
 * Table column definition
 */
export interface TableColumn<T = any> {
  key: keyof T | string;
  header: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'status' | 'action' | 'custom';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: string;
  class?: string;
  headerClass?: string;
  cellClass?: string;
}

/**
 * Table action definition
 */
export interface TableAction {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  handler: (item: any) => void;
  show?: (item: any) => boolean;
  disabled?: (item: any) => boolean;
  confirm?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
}

/**
 * Table sort state
 */
export interface TableSort {
  column: string;
  direction: 'asc' | 'desc' | null;
}

/**
 * Table filter state
 */
export interface TableFilter {
  column: string;
  value: string | number | boolean | null;
  operator?: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
}

/**
 * Table pagination state
 */
export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Status badge configuration
 */
export interface StatusBadge {
  value: string;
  label: string;
  color: string;
  icon?: string;
}

/**
 * Table configuration
 */
export interface TableConfig {
  columns: TableColumn[];
  actions?: TableAction[];
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  showHeader?: boolean;
  showFooter?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
}

/**
 * Table data source
 */
export interface TableDataSource<T = any> {
  data: T[];
  loading?: boolean;
  total?: number;
}

/**
 * Currency format options
 */
export interface CurrencyFormatOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Date format options
 */
export interface DateFormatOptions {
  format?: string;
  locale?: string;
}
