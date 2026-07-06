/**
 * Dashboard models and interfaces
 * Based on Swagger API specification
 */

/**
 * Dashboard statistics card data
 */
export interface DashboardStats {
  total: number;
  count?: number;
  percentage?: number;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Employee statistics
 */
export interface EmployeeStatistics {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  newThisMonth: number;
}

/**
 * Cash transaction statistics
 */
export interface CashTransactionStatistics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

/**
 * Invoice statistics
 */
export interface InvoiceStatistics {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

/**
 * Payment statistics
 */
export interface PaymentStatistics {
  totalPayments: number;
  totalAmount: number;
  thisMonthPayments: number;
  thisMonthAmount: number;
}

/**
 * Dashboard overview data
 */
export interface DashboardOverview {
  employeeStats: EmployeeStatistics;
  transactionStats: CashTransactionStatistics;
  invoiceStats: InvoiceStatistics;
  paymentStats: PaymentStatistics;
}

/**
 * Recent transaction item
 */
export interface RecentTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  description: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
}

/**
 * Dashboard card configuration
 */
export interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  route?: string;
}

/**
 * Quick menu item
 */
export interface QuickMenuItem {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
  badge?: number;
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  label: string;
  value: number;
}

/**
 * Monthly chart data
 */
export interface MonthlyChartData {
  month: string;
  income: number;
  expense: number;
}
