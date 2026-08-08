import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import { DashboardOverview, MonthlyChartData } from './dashboard.model';

/**
 * Dashboard Service.
 *
 * Single aggregated call to `GET /dashboard/overview`. All dashboard sections
 * (saldo cards, status unit, charts, Kas bulan ini, recent transactions) are
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

  /** Per-month IPL income/expense for the selected year (dashboard chart). */
  getIplMonthlyChart(year: number): Observable<MonthlyChartData[]> {
    return this.apiService
      .get<{ year: number; series: MonthlyChartData[] }>(`/dashboard/ipl-monthly-chart?year=${year}`)
      .pipe(
        map(response => response.data.series),
        catchError(error => {
          console.error('Error fetching IPL monthly chart:', error);
          return of([]);
        }),
      );
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
      iplMonthlyChart: [],
      wargaMonthlyChart: [],
      delinquent: { count: 0, asOfLabel: null },
      occupancy: {
        totalUnits: 0,
        fullyOccupied: 0,
        occasionally: 0,
        vacant: 0,
        rented: 0,
        bankBuyback: 0,
      },
      recentTransactions: [],
    };
  }
}
