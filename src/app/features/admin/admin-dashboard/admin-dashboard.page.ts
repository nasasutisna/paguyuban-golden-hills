import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { Subscription, Observable, forkJoin } from 'rxjs';
import { DashboardService } from './dashboard.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  DashboardCard,
  QuickMenuItem,
  RecentTransaction,
  MonthlyChartData
} from './dashboard.model';

/**
 * Admin Dashboard Page
 * Displays overview with cards, charts, recent transactions, and quick menu
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss']
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  // Dashboard data
  dashboardCards: DashboardCard[] = [];
  dashboardIuranCards: DashboardCard[] = [];
  quickMenuItems: QuickMenuItem[] = [];
  recentTransactions: RecentTransaction[] = [];
  monthlyChartData: MonthlyChartData[] = [];

  // Loading states
  isLoading = true;
  isLoadingCards = true;
  isLoadingTransactions = true;
  isLoadingChart = true;

  // Statistics for display
  totalEmployees = 0;
  totalIncome = 0;
  totalExpenses = 0;
  pendingInvoices = 0;
  balance = 0;

  private subscriptions: Subscription[] = [];

  constructor() { }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Load all dashboard data
   */
  loadDashboardData(): void {
    this.isLoading = true;

    // Load data in parallel groups
    this.loadCards();
    this.loadRecentTransactions();
    this.loadChartData();
    this.loadQuickMenu();

    // Simulate overall loading completion
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Load dashboard cards statistics
   */
  private loadCards(): void {
    this.isLoadingCards = true;

    forkJoin({
      employeeStats: this.dashboardService.getEmployeeStatistics(),
      transactionStats: this.dashboardService.getTransactionStatistics(
        this.getCurrentMonthStart(),
        this.getCurrentMonthEnd()
      ),
      invoiceStats: this.dashboardService.getInvoiceStatistics()
    }).subscribe({
      next: ({ employeeStats, transactionStats, invoiceStats }) => {
        this.totalEmployees = employeeStats.totalEmployees || 0;
        this.totalIncome = transactionStats.totalIncome || 0;
        this.totalExpenses = transactionStats.totalExpense || 0;
        this.balance = transactionStats.balance || 0;
        this.pendingInvoices = invoiceStats.pendingInvoices || 0;

        this.dashboardCards = [
          {
            id: 'income',
            title: 'Pemasukan Bulan Ini',
            value: this.formatCurrency(this.totalIncome),
            icon: 'trending-up',
            color: 'success',
            route: '/transactions/income'
          },
          {
            id: 'expenses',
            title: 'Pengeluaran Bulan Ini',
            value: this.formatCurrency(this.totalExpenses),
            icon: 'trending-down',
            color: 'danger',
            route: '/transactions/expense'
          },
          {
            id: 'balance',
            title: 'Balance',
            value: this.formatCurrency(this.balance),
            icon: 'wallet',
            color: this.balance >= 0 ? 'success' : 'danger',
            route: '/transactions'
          },
          {
            id: 'pending-invoices',
            title: 'Belum Bayar IPL',
            value: this.pendingInvoices,
            icon: 'document-text',
            color: 'warning',
            route: '/invoices?status=pending'
          }
        ];

         this.dashboardIuranCards = [
          {
            id: 'income',
            title: 'Pemasukan Bulan Ini',
            value: this.formatCurrency(this.totalIncome),
            icon: 'trending-up',
            color: 'success',
            route: '/transactions/income'
          },
          {
            id: 'expenses',
            title: 'Pengeluaran Bulan Ini',
            value: this.formatCurrency(this.totalExpenses),
            icon: 'trending-down',
            color: 'danger',
            route: '/transactions/expense'
          },
          {
            id: 'balance',
            title: 'Balance',
            value: this.formatCurrency(this.balance),
            icon: 'wallet',
            color: this.balance >= 0 ? 'success' : 'danger',
            route: '/transactions'
          },
          {
            id: 'pending-invoices',
            title: 'Belum Bayar IPL',
            value: this.pendingInvoices,
            icon: 'document-text',
            color: 'warning',
            route: '/invoices?status=pending'
          }
        ];

        this.isLoadingCards = false;
      },
      error: (error) => {
        console.error('Error loading dashboard cards:', error);
        this.toastService.error('Failed to load statistics');
        this.isLoadingCards = false;
      }
    });
  }

  /**
   * Load recent transactions
   */
  private loadRecentTransactions(): void {
    this.isLoadingTransactions = true;

    this.dashboardService.getRecentTransactions(5).subscribe({
      next: transactions => {
        this.recentTransactions = transactions;
        this.isLoadingTransactions = false;
      },
      error: (error) => {
        console.error('Error loading recent transactions:', error);
        this.isLoadingTransactions = false;
      }
    });
  }

  /**
   * Load monthly chart data
   */
  private loadChartData(): void {
    this.isLoadingChart = true;

    this.dashboardService.getMonthlyChartData().subscribe({
      next: data => {
        this.monthlyChartData = data;
        this.isLoadingChart = false;
      },
      error: (error) => {
        console.error('Error loading chart data:', error);
        this.isLoadingChart = false;
      }
    });
  }

  /**
   * Load quick menu items
   */
  private loadQuickMenu(): void {
    this.dashboardService.getQuickMenuItems().subscribe(items => {
      this.quickMenuItems = items;
    });
  }

  /**
   * Handle pull to refresh
   */
  handleRefresh(event: RefresherCustomEvent): void {
    this.loadDashboardData();

    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  /**
   * Navigate to card route
   */
  navigateToCard(route: string | undefined): void {
    if (route) {
      this.router.navigateByUrl(route);
    }
  }

  /**
   * Navigate to quick menu item
   */
  navigateToMenuItem(item: QuickMenuItem): void {
    this.router.navigateByUrl(item.route);
  }

  /**
   * Navigate to transaction details
   */
  navigateToTransaction(transactionId: string): void {
    this.router.navigateByUrl(`/transactions/${transactionId}`);
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Get transaction status color
   */
  getTransactionStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger'
    };
    return colors[status] || 'medium';
  }

  /**
   * Get transaction icon based on type
   */
  getTransactionIcon(type: string): string {
    return type === 'INCOME' ? 'arrow-up-circle' : 'arrow-down-circle';
  }

  /**
   * Get transaction color based on type
   */
  getTransactionColor(type: string): string {
    return type === 'INCOME' ? 'success' : 'danger';
  }

  /**
   * Check if transactions exist
   */
  hasTransactions(): boolean {
    return this.recentTransactions.length > 0;
  }

  /**
   * Check if chart data exists
   */
  hasChartData(): boolean {
    return this.monthlyChartData.some(d => d.income > 0 || d.expense > 0);
  }

  /**
   * Get current month start date
   */
  private getCurrentMonthStart(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }

  /**
   * Get current month end date
   */
  private getCurrentMonthEnd(): string {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  }

  /**
   * Get maximum value in chart data for scaling
   */
  getMaxChartValue(): number {
    const maxIncome = Math.max(...this.monthlyChartData.map(d => d.income));
    const maxExpense = Math.max(...this.monthlyChartData.map(d => d.expense));
    return Math.max(maxIncome, maxExpense, 100);
  }

  /**
   * Get bar height percentage for chart
   */
  getBarHeight(value: number): number {
    const maxValue = this.getMaxChartValue();
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }
}
