/**
 * Employee Salary Headers (Penggajian) Service.
 * Handles API calls for the simple flat-amount payroll flow.
 */

import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import {
  EmployeeSalaryHeader,
  CreateSimplePayrollDto,
  EmployeeSalaryHeadersResponse,
  EmployeeSalaryHeadersQueryParams,
} from './employee-salary-headers.model';

@Injectable({
  providedIn: 'root',
})
export class EmployeeSalaryHeadersService {
  private apiService = inject(ApiService);
  private readonly basePath = '/employee-salary-headers';

  /**
   * Paginated list of payroll headers.
   * Backend returns `{ headers, total }` (no meta), so totalPages is computed.
   */
  getAll(params?: EmployeeSalaryHeadersQueryParams): Observable<EmployeeSalaryHeadersResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`${this.basePath}${queryParams}`).pipe(
      map((response) => {
        const payload = response.data || {};
        const rawList = Array.isArray(payload)
          ? payload
          : payload.headers || payload.data || [];
        const data = rawList.map((item: any) => this.normalizeHeader(item));
        const total = Array.isArray(payload)
          ? response?.meta?.total ?? data.length
          : payload.total ?? response?.meta?.total ?? data.length;
        const limit = params?.limit ?? 10;
        return {
          data,
          total,
          page: params?.page ?? 1,
          limit,
          totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
        };
      }),
      catchError((error) => {
        console.error('[EmployeeSalaryHeadersService] Error fetching payroll:', error);
        return of({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      }),
    );
  }

  /**
   * Single payroll header, including the linked Kas IPL expense (if paid).
   */
  getById(id: string): Observable<EmployeeSalaryHeader | null> {
    return this.apiService.get<any>(`${this.basePath}/${id}`).pipe(
      map((response) => (response.data ? this.normalizeHeader(response.data) : null)),
      catchError((error) => {
        console.error('[EmployeeSalaryHeadersService] Error fetching payroll detail:', error);
        return of(null);
      }),
    );
  }

  /**
   * Undo a paid payroll: header → CANCELLED, linked Kas IPL expense soft-deleted.
   * Returns the updated header (+ cancelledCashTransactionNumber).
   */
  cancel(id: string, reason?: string): Observable<EmployeeSalaryHeader | null> {
    return this.apiService
      .patch<any>(`${this.basePath}/${id}/cancel`, { reason })
      .pipe(
        map((response) => (response.data ? this.normalizeHeader(response.data) : null)),
        catchError((error) => {
          console.error('[EmployeeSalaryHeadersService] Error cancelling payroll:', error);
          throw error;
        }),
      );
  }

  /**
   * Simple flat-amount payroll: create a PAID header + post IPL expense.
   */
  createSimple(dto: CreateSimplePayrollDto): Observable<EmployeeSalaryHeader | null> {
    return this.apiService
      .post<EmployeeSalaryHeader>(`${this.basePath}/simple`, dto)
      .pipe(
        map((response) => (response.data ? this.normalizeHeader(response.data) : null)),
        catchError((error) => {
          console.error('[EmployeeSalaryHeadersService] Error creating payroll:', error);
          throw error;
        }),
      );
  }

  private buildQueryParams(params?: EmployeeSalaryHeadersQueryParams): string {
    if (!params) return '';
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page.toString());
    if (params.limit) qp.append('limit', params.limit.toString());
    if (params.sortBy) qp.append('sortBy', params.sortBy);
    if (params.sortOrder) qp.append('sortOrder', params.sortOrder);
    if (params.status) qp.append('status', params.status);
    if (params.employeeId) qp.append('employeeId', params.employeeId);
    if (params.payPeriod) qp.append('payPeriod', params.payPeriod);
    if (params.search) qp.append('search', params.search);
    const s = qp.toString();
    return s ? `?${s}` : '';
  }

  /** Coerce API decimals (may arrive as strings) + flatten employee display fields. */
  private normalizeHeader(item: any): EmployeeSalaryHeader {
    const emp = item.employee || {};
    const firstName = emp.firstName || '';
    const lastName = emp.lastName || '';
    const cash = item.cashTransaction;
    return {
      ...item,
      basicSalary: this.toNumber(item.basicSalary),
      totalAllowances: this.toNumber(item.totalAllowances),
      totalDeductions: this.toNumber(item.totalDeductions),
      netSalary: this.toNumber(item.netSalary),
      employeeName: `${firstName} ${lastName}`.trim(),
      positionName: emp.position?.positionName || '',
      cashTransaction: cash ? { ...cash, amount: this.toNumber(cash.amount) } : cash,
      cashTransactionId: cash?.id || item.cashTransactionId,
    };
  }

  private toNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(n) ? undefined : n;
  }
}
