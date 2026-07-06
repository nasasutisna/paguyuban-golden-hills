import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import {
  DashboardOverview,
  EmployeeStatistics,
  CashTransactionStatistics,
  InvoiceStatistics,
  PaymentStatistics,
  RecentTransaction,
  MonthlyChartData,
  DashboardCard,
  QuickMenuItem
} from './dashboard.model';
import { ApiResponse } from '@core/api/api.service';
import { environment } from 'src/environments/environment';

/**
 * Base API URL for dashboard endpoints
 */
const API_BASE = environment.apiUrl

/**
 * Dashboard Service
 * Handles all dashboard data fetching and processing
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiService = inject(ApiService);
  private http = inject(HttpClient);

  constructor() {
    this.apiService.setBaseUrl(API_BASE);
  }

  /**
   * Get dashboard overview with all statistics
   */
  getDashboardOverview(): Observable<DashboardOverview> {
    // Fetch all statistics in parallel
    return of({} as DashboardOverview);
  }

  /**
   * Get employee statistics
   */
  getEmployeeStatistics(): Observable<EmployeeStatistics> {
    return this.http.get<ApiResponse<EmployeeStatistics>>('/employees/statistics').pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employee statistics:', error);
        return of(this.getDefaultEmployeeStats());
      })
    );
  }

  /**
   * Get cash transaction statistics for a date range
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   */
  getTransactionStatistics(startDate: string, endDate: string): Observable<CashTransactionStatistics> {
    return this.http
      .get<ApiResponse<CashTransactionStatistics>>(
        `/cash-transactions/statistics?startDate=${startDate}&endDate=${endDate}`
      )
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error fetching transaction statistics:', error);
          return of(this.getDefaultTransactionStats());
        })
      );
  }

  /**
   * Get invoice statistics
   */
  getInvoiceStatistics(): Observable<InvoiceStatistics> {
    return this.http.get<ApiResponse<InvoiceStatistics>>('/resident-invoices/statistics').pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching invoice statistics:', error);
        return of(this.getDefaultInvoiceStats());
      })
    );
  }

  /**
   * Get payment statistics
   */
  getPaymentStatistics(): Observable<PaymentStatistics> {
    return this.http.get<ApiResponse<PaymentStatistics>>('/resident-payments/statistics').pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching payment statistics:', error);
        return of(this.getDefaultPaymentStats());
      })
    );
  }

  /**
   * Get recent transactions
   * @param limit - Number of recent transactions to fetch
   */
  getRecentTransactions(limit = 10): Observable<RecentTransaction[]> {
    return this.http
      .get<ApiResponse<RecentTransaction[]>>(`/cash-transacters/recent?limit=${limit}`)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error fetching recent transactions:', error);
          return of([]);
        })
      );
  }

  /**
   * Get monthly chart data for the current year
   */
  getMonthlyChartData(): Observable<MonthlyChartData[]> {
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    return this.getTransactionStatistics(startDate, endDate).pipe(
      map(stats => [
        {
          month: 'Jan',
          income: stats.totalIncome || 0,
          expense: stats.totalExpense || 0
        },
        {
          month: 'Feb',
          income: 0,
          expense: 0
        },
        {
          month: 'Mar',
          income: 0,
          expense: 0
        },
        {
          month: 'Apr',
          income: 0,
          expense: 0
        },
        {
          month: 'May',
          income: 0,
          expense: 0
        },
        {
          month: 'Jun',
          income: 0,
          expense: 0
        },
        {
          month: 'Jul',
          income: 0,
          expense: 0
        },
        {
          month: 'Aug',
          income: 0,
          expense: 0
        },
        {
          month: 'Sep',
          income: 0,
          expense: 0
        },
        {
          month: 'Oct',
          income: 0,
          expense: 0
        },
        {
          month: 'Nov',
          income: 0,
          expense: 0
        },
        {
          month: 'Dec',
          income: 0,
          expense: 0
        }
      ]),
      catchError(error => {
        console.error('Error fetching chart data:', error);
        return of([]);
      })
    );
  }

  /**
   * Get dashboard cards configuration
   */
  getDashboardCards(): Observable<DashboardCard[]> {
    return of([
      {
        id: 'employees',
        title: 'Total Employees',
        value: 0,
        icon: 'people',
        color: 'primary',
        route: '/employees'
      },
      {
        id: 'income',
        title: 'Total Income',
        value: 0,
        icon: 'trending-up',
        color: 'success',
        route: '/transactions/income'
      },
      {
        id: 'expenses',
        title: 'Total Expenses',
        value: 0,
        icon: 'trending-down',
        color: 'danger',
        route: '/transactions/expense'
      },
      {
        id: 'invoices',
        title: 'Pending Invoices',
        value: 0,
        icon: 'document',
        color: 'warning',
        route: '/invoices'
      }
    ]);
  }

  /**
   * Get quick menu items
   */
  getQuickMenuItems(): Observable<QuickMenuItem[]> {
    return of([
      {
        id: 'add-transaction',
        title: 'Add Transaction',
        icon: 'add-circle',
        color: 'success',
        route: '/transactions/new'
      },
      {
        id: 'add-employee',
        title: 'Add Employee',
        icon: 'person-add',
        color: 'primary',
        route: '/employees/new'
      },
      {
        id: 'create-invoice',
        title: 'Create Invoice',
        icon: 'document-text',
        color: 'tertiary',
        route: '/invoices/new'
      },
      {
        id: 'manage-residents',
        title: 'Manage Residents',
        icon: 'home',
        color: 'secondary',
        route: '/residents'
      },
      {
        id: 'manage-blocks',
        title: 'Manage House Blocks',
        icon: 'business',
        color: 'secondary',
        route: '/admin/house-blocks'
      }
    ]);
  }

  // Default fallback values
  private getDefaultEmployeeStats(): EmployeeStatistics {
    return {
      totalEmployees: 0,
      activeEmployees: 0,
      inactiveEmployees: 0,
      newThisMonth: 0
    };
  }

  private getDefaultTransactionStats(): CashTransactionStatistics {
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      transactionCount: 0
    };
  }

  private getDefaultInvoiceStats(): InvoiceStatistics {
    return {
      totalInvoices: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
      overdueInvoices: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0
    };
  }

  private getDefaultPaymentStats(): PaymentStatistics {
    return {
      totalPayments: 0,
      totalAmount: 0,
      thisMonthPayments: 0,
      thisMonthAmount: 0
    };
  }
}
