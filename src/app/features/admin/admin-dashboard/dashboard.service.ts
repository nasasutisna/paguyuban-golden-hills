import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import { DashboardOverview, QuickMenuItem } from './dashboard.model';

/**
 * Dashboard Service.
 *
 * Single aggregated call to `GET /dashboard/overview`. All dashboard sections
 * (welcome banner, per-Kas cards, monthly chart, recent transactions) are
 * derived from this one payload.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiService = inject(ApiService);

  /** Aggregated dashboard data for all sections. */
  getDashboardOverview(): Observable<DashboardOverview> {
    return this.apiService.get<DashboardOverview>('/dashboard/overview').pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching dashboard overview:', error);
        return of(this.emptyOverview());
      }),
    );
  }

  /**
   * Static quick-action shortcuts. Routes point to existing admin pages.
   */
  getQuickMenuItems(): Observable<QuickMenuItem[]> {
    return of([
      {
        id: 'add-transaction',
        title: 'Tambah Transaksi',
        icon: 'add-circle',
        color: 'success',
        route: '/admin/cash-transactions/create',
      },
      {
        id: 'transfer-kas',
        title: 'Transfer Antar Kas',
        icon: 'swap-horizontal',
        color: 'primary',
        route: '/admin/cash-transactions/transfer',
      },
      {
        id: 'ipl-payment',
        title: 'Bayar IPL',
        icon: 'receipt',
        color: 'tertiary',
        route: '/admin/ipl-payments',
      },
      {
        id: 'cash-transactions',
        title: 'Daftar Transaksi',
        icon: 'list',
        color: 'secondary',
        route: '/admin/cash-transactions',
      },
      {
        id: 'house-blocks',
        title: 'Blok Rumah',
        icon: 'business',
        color: 'secondary',
        route: '/admin/house-blocks',
      },
    ]);
  }

  private emptyOverview(): DashboardOverview {
    return {
      houseUnits: { total: 0, active: 0 },
      ipl: {
        period: null,
        totalUnits: 0,
        paidUnits: 0,
        pendingUnits: 0,
        unpaidUnits: 0,
        totalAmount: 0,
      },
      iplFund: { income: 0, expense: 0, balance: 0 },
      wargaFund: { income: 0, expense: 0, balance: 0 },
      balances: { ipl: 0, warga: 0 },
      monthlyChart: [],
      recentTransactions: [],
    };
  }
}
