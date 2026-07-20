import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { DashboardService } from './dashboard.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  DashboardCard,
  DashboardOverview,
  QuickMenuItem,
  RecentTransaction,
  MonthlyChartData,
} from './dashboard.model';

/**
 * Admin Dashboard Page.
 *
 * Renders from a single aggregated payload (`getDashboardOverview`):
 * welcome banner (house units + IPL collection status), per-Kas cards
 * (Kas IPL / Kas Warga), a monthly income/expense chart, quick actions,
 * and recent transactions.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  // Section data
  dashboardCards: DashboardCard[] = [];
  dashboardIuranCards: DashboardCard[] = [];
  quickMenuItems: QuickMenuItem[] = [];
  recentTransactions: RecentTransaction[] = [];
  monthlyChartData: MonthlyChartData[] = [];

  // Welcome banner figures
  totalHouseUnits = 0;
  iplPaidUnits = 0;
  iplUnpaidUnits = 0;
  iplPeriodLabel = '';

  // Loading states
  isLoading = true;
  isLoadingChart = true;
  isLoadingTransactions = true;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /** Fetch the single overview payload and map it into the view models. */
  loadDashboardData(): void {
    this.isLoading = true;
    this.isLoadingChart = true;
    this.isLoadingTransactions = true;

    const sub = this.dashboardService.getDashboardOverview().subscribe({
      next: overview => {
        this.applyOverview(overview);
        this.isLoading = false;
      },
      error: error => {
        console.error('Error loading dashboard:', error);
        this.toastService.error('Gagal memuat dashboard');
        this.isLoading = false;
        this.isLoadingChart = false;
        this.isLoadingTransactions = false;
      },
    });
    this.subscriptions.push(sub);

    this.loadQuickMenu();
  }

  /** Map the overview payload into all section view models. */
  private applyOverview(o: DashboardOverview): void {
    // Welcome banner
    this.totalHouseUnits = o.houseUnits?.total ?? 0;
    this.iplPaidUnits = o.ipl?.paidUnits ?? 0;
    this.iplUnpaidUnits = o.ipl?.unpaidUnits ?? 0;
    this.iplPeriodLabel = o.ipl?.period?.label ?? '';

    // Kas IPL cards (income / expense / saldo / belum bayar)
    this.dashboardCards = [
      {
        id: 'ipl-income',
        title: 'Pemasukan IPL',
        value: this.formatCurrency(o.iplFund?.income ?? 0),
        icon: 'trending-up',
        color: 'success',
        route: '/admin/cash-transactions',
      },
      {
        id: 'ipl-expense',
        title: 'Pengeluaran IPL',
        value: this.formatCurrency(o.iplFund?.expense ?? 0),
        icon: 'trending-down',
        color: 'danger',
        route: '/admin/cash-transactions',
      },
      {
        id: 'ipl-balance',
        title: 'Saldo Kas IPL',
        value: this.formatCurrency(o.balances?.ipl ?? 0),
        icon: 'wallet',
        color: 'primary',
        route: '/admin/cash-transactions',
      },
      {
        id: 'ipl-unpaid',
        title: 'Belum Bayar IPL',
        value: o.ipl?.unpaidUnits ?? 0,
        icon: 'document-text',
        color: 'warning',
        route: '/admin/ipl-payments',
      },
    ];

    // Kas Warga cards (income / expense / saldo)
    this.dashboardIuranCards = [
      {
        id: 'warga-income',
        title: 'Pemasukan Warga',
        value: this.formatCurrency(o.wargaFund?.income ?? 0),
        icon: 'trending-up',
        color: 'success',
        route: '/admin/cash-transactions',
      },
      {
        id: 'warga-expense',
        title: 'Pengeluaran Warga',
        value: this.formatCurrency(o.wargaFund?.expense ?? 0),
        icon: 'trending-down',
        color: 'danger',
        route: '/admin/cash-transactions',
      },
      {
        id: 'warga-balance',
        title: 'Saldo Kas Warga',
        value: this.formatCurrency(o.balances?.warga ?? 0),
        icon: 'people',
        color: 'tertiary',
        route: '/admin/cash-transactions',
      },
    ];

    this.monthlyChartData = o.monthlyChart ?? [];
    this.recentTransactions = o.recentTransactions ?? [];
    this.isLoadingChart = false;
    this.isLoadingTransactions = false;
  }

  private loadQuickMenu(): void {
    const sub = this.dashboardService.getQuickMenuItems().subscribe(items => {
      this.quickMenuItems = items;
    });
    this.subscriptions.push(sub);
  }

  /** Handle pull-to-refresh. */
  handleRefresh(event: RefresherCustomEvent): void {
    this.loadDashboardData();
    setTimeout(() => event.target.complete(), 800);
  }

  navigateToCard(route: string | undefined): void {
    if (route) this.router.navigateByUrl(route);
  }

  navigateToMenuItem(item: QuickMenuItem): void {
    this.router.navigateByUrl(item.route);
  }

  navigateToTransaction(transactionId: string): void {
    this.router.navigateByUrl(`/admin/cash-transactions/${transactionId}`);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount ?? 0);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getTransactionStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger',
    };
    return colors[status] || 'medium';
  }

  getTransactionIcon(type: string): string {
    return type === 'INCOME' ? 'arrow-up-circle' : 'arrow-down-circle';
  }

  hasTransactions(): boolean {
    return this.recentTransactions.length > 0;
  }

  hasChartData(): boolean {
    return this.monthlyChartData.some(d => d.income > 0 || d.expense > 0);
  }

  getMaxChartValue(): number {
    const maxIncome = Math.max(...this.monthlyChartData.map(d => d.income), 0);
    const maxExpense = Math.max(...this.monthlyChartData.map(d => d.expense), 0);
    return Math.max(maxIncome, maxExpense, 100);
  }

  getBarHeight(value: number): number {
    const maxValue = this.getMaxChartValue();
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }
}
