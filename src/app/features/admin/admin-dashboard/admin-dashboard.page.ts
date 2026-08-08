import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { DashboardService } from './dashboard.service';
import { ToastService } from '@services/toast.service';
import { ADMIN_COLORS } from '@shared/ui/admin-theme.config';
import { AuthService } from '@core/auth/auth.service';
import {
  DashboardCard,
  DashboardOverview,
  RecentTransaction,
} from './dashboard.model';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Admin Dashboard Page.
 *
 * Renders from a single aggregated payload (`getDashboardOverview`):
 * saldo kas (all-time), status pembayaran unit, alert tunggakan IPL,
 * chart pemasukan/pengeluaran IPL per bulan, Kas IPL & Iuran bulan ini,
 * dan transaksi terakhir.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, BaseChartDirective],
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  // Header
  iplPeriodLabel = '';
  totalHouseUnits = 0;

  // Saldo kas (all-time)
  saldoIpl = 0;
  saldoWarga = 0;

  // Status pembayaran unit (req #7-9)
  unitFull = 0; // FULLY_OCCUPIED + RENTED (iplPercentage 100%)
  unitSetengah = 0; // OCCASIONALLY (50%)
  unitKosong = 0; // VACANT
  unitBuyback = 0; // isBankBuyback

  // Alert tunggakan IPL (req #5)
  delinquentCount = 0;
  delinquentAsOfLabel: string | null = null;

  // Kas bulan ini (req #10-11)
  dashboardCards: DashboardCard[] = [];
  dashboardIuranCards: DashboardCard[] = [];

  // Chart data (req #3 pemasukan, #4 pengeluaran) — year-filterable
  chartYear = new Date().getFullYear();
  isLoadingChart = false;
  iplIncomeChartData: ChartConfiguration<'bar'>['data'] = this.emptyBarData('Pemasukan IPL', ADMIN_COLORS.success);
  iplExpenseChartData: ChartConfiguration<'bar'>['data'] = this.emptyBarData('Pengeluaran IPL', ADMIN_COLORS.danger);

  /** Year filter options: current year and ±1 (mirrors the Matrix IPL filter). */
  get yearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear + 1];
  }

  readonly barChartType: 'bar' = 'bar';

  readonly barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { boxWidth: 12, font: { size: 11 }, usePointStyle: true },
      },
      tooltip: {
        callbacks: {
          label: ctx => ` ${this.formatCurrency(Number(ctx.parsed.y ?? 0))}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { callback: v => this.formatCompact(Number(v)), font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  };

  recentTransactions: RecentTransaction[] = [];

  // Loading states
  isLoading = true;

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

    const sub = this.dashboardService.getDashboardOverview().subscribe({
      next: overview => {
        this.applyOverview(overview);
        this.isLoading = false;
      },
      error: error => {
        console.error('Error loading dashboard:', error);
        this.toastService.error('Gagal memuat dashboard');
        this.isLoading = false;
      },
    });
    this.subscriptions.push(sub);

    // Chart data is year-filterable, loaded separately from the overview.
    this.loadIplChart(this.chartYear);
  }

  /** Load the IPL income/expense chart for the given year. */
  loadIplChart(year: number): void {
    this.isLoadingChart = true;
    const sub = this.dashboardService.getIplMonthlyChart(year).subscribe({
      next: series => {
        this.iplIncomeChartData = this.buildBarData('Pemasukan IPL', ADMIN_COLORS.success, series.map(d => d.income));
        this.iplExpenseChartData = this.buildBarData('Pengeluaran IPL', ADMIN_COLORS.danger, series.map(d => d.expense));
        this.isLoadingChart = false;
      },
      error: () => {
        this.isLoadingChart = false;
      },
    });
    this.subscriptions.push(sub);
  }

  /** Year-filter handler (mirrors the Matrix IPL filter). */
  onChartYearChange(event: CustomEvent): void {
    const value = (event.detail as { value?: number })?.value;
    if (value != null && value !== this.chartYear) {
      this.chartYear = value;
      this.loadIplChart(this.chartYear);
    }
  }

  /** Map the overview payload into all section view models. */
  private applyOverview(o: DashboardOverview): void {
    // Header
    this.iplPeriodLabel = o.ipl?.period?.label ?? '';
    this.totalHouseUnits = o.houseUnits?.total ?? 0;

    // Saldo kas (all-time, masuk - keluar)
    this.saldoIpl = o.balances?.ipl ?? 0;
    this.saldoWarga = o.balances?.warga ?? 0;

    // Status pembayaran unit (berdasarkan kewajiban IPL / status hunian)
    const occ = o.occupancy;
    this.unitFull = (occ?.fullyOccupied ?? 0) + (occ?.rented ?? 0);
    this.unitSetengah = occ?.occasionally ?? 0;
    this.unitKosong = occ?.vacant ?? 0;
    this.unitBuyback = occ?.bankBuyback ?? 0;

    // Tunggakan IPL
    this.delinquentCount = o.delinquent?.count ?? 0;
    this.delinquentAsOfLabel = o.delinquent?.asOfLabel ?? null;

    // Kas IPL bulan ini (income / expense / saldo)
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
        value: this.formatCurrency(o.iplFund?.balance ?? 0),
        icon: 'wallet',
        color: 'primary',
        route: '/admin/cash-transactions',
      },
    ];

    // Kas Iuran bulan ini (income / expense / saldo)
    this.dashboardIuranCards = [
      {
        id: 'warga-income',
        title: 'Pemasukan Iuran',
        value: this.formatCurrency(o.wargaFund?.income ?? 0),
        icon: 'trending-up',
        color: 'success',
        route: '/admin/cash-transactions',
      },
      {
        id: 'warga-expense',
        title: 'Pengeluaran Iuran',
        value: this.formatCurrency(o.wargaFund?.expense ?? 0),
        icon: 'trending-down',
        color: 'danger',
        route: '/admin/cash-transactions',
      },
      {
        id: 'warga-balance',
        title: 'Saldo Kas Iuran',
        value: this.formatCurrency(o.wargaFund?.balance ?? 0),
        icon: 'wallet',
        color: 'tertiary',
        route: '/admin/cash-transactions',
      },
    ];

    this.recentTransactions = o.recentTransactions ?? [];
  }

  private emptyBarData(label: string, color: string): ChartConfiguration<'bar'>['data'] {
    return {
      labels: [...MONTH_LABELS],
      datasets: [{ label, data: MONTH_LABELS.map(() => 0), backgroundColor: color, borderRadius: 6, maxBarThickness: 28 }],
    };
  }

  private buildBarData(label: string, color: string, data: number[]): ChartConfiguration<'bar'>['data'] {
    return {
      labels: [...MONTH_LABELS],
      datasets: [{ label, data, backgroundColor: color, borderRadius: 6, maxBarThickness: 28 }],
    };
  }

  /** Handle pull-to-refresh. */
  handleRefresh(event: RefresherCustomEvent): void {
    this.loadDashboardData();
    setTimeout(() => event.target.complete(), 800);
  }

  /**
   * Only ADMIN / ACCOUNTANT / SUPERADMIN may follow the dashboard's shortcut
   * links into the management pages. Other roles still see the figures but the
   * cards are inert (no click, no pointer cursor).
   */
  get canNavigate(): boolean {
    const role = this.authService.currentUser?.role?.name || '';
    return role === 'SUPERADMIN' || role === 'ADMIN' || role === 'ACCOUNTANT';
  }

  navigateTo(route: string | undefined): void {
    if (!this.canNavigate || !route) return;
    this.router.navigateByUrl(route);
  }

  navigateToTransaction(transactionId: string): void {
    if (!this.canNavigate) return;
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

  /** Compact axis ticks (Rp 1,2 jt). */
  formatCompact(value: number): string {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} jt`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)} rb`;
    return `${value}`;
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
}
