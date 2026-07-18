import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import {
  ExpenseRequest,
  CreateExpenseRequestDto,
  ApproveExpenseRequestDto,
  RejectExpenseRequestDto,
  ExpenseRequestQueryParams,
  ExpenseRequestListResponse,
} from './expense-requests.model';

/**
 * Expense Requests Service
 * All HTTP for the "Request Pengeluaran" feature.
 *
 * Backend response envelope (TransformInterceptor):
 *  - list/pending/mine -> response.data = ExpenseRequest[], response.meta = {page,limit,total,totalPages,...}
 *  - findOne/create/approve/reject/cancel -> response.data = ExpenseRequest
 *
 * List methods defensively reshape because the wrapper may put the array at
 * response.data OR nested at response.data.data (mirrors resident-payments.service.ts).
 */
@Injectable({ providedIn: 'root' })
export class ExpenseRequestsService {
  private apiService = inject(ApiService);

  /** List all expense requests (ADMIN, ACCOUNTANT, MANAGER). */
  getAll(params?: ExpenseRequestQueryParams): Observable<ExpenseRequestListResponse> {
    const query = this.buildQueryParams(params);
    return this.apiService.get<any>(`/expense-requests${query}`).pipe(
      map((response) => this.reshapeList(response)),
      catchError(() => of(this.emptyList()))
    );
  }

  /** List pending requests (ADMIN, ACCOUNTANT) — approval queue. */
  getPending(params?: ExpenseRequestQueryParams): Observable<ExpenseRequestListResponse> {
    const query = this.buildQueryParams(params);
    return this.apiService.get<any>(`/expense-requests/pending${query}`).pipe(
      map((response) => this.reshapeList(response)),
      catchError(() => of(this.emptyList()))
    );
  }

  /** List the current user's own requests (all authenticated roles). */
  getMine(params?: ExpenseRequestQueryParams): Observable<ExpenseRequestListResponse> {
    const query = this.buildQueryParams(params);
    return this.apiService.get<any>(`/expense-requests/mine${query}`).pipe(
      map((response) => this.reshapeList(response)),
      catchError(() => of(this.emptyList()))
    );
  }

  /** Get a single request with files + approval history (ownership-checked backend-side). */
  getById(id: string): Observable<ExpenseRequest | null> {
    return this.apiService.get<ExpenseRequest>(`/expense-requests/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching expense request:', error);
        return of(null);
      })
    );
  }

  /**
   * Create a request. `fileIds` are proof-photo ids uploaded beforehand via
   * FileAttachmentsService.uploadFiles(...). Backend auto-approves for
   * SUPERADMIN/ADMIN/ACCOUNTANT; otherwise PENDING.
   */
  create(dto: CreateExpenseRequestDto): Observable<ExpenseRequest | null> {
    return this.apiService.post<ExpenseRequest>('/expense-requests', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating expense request:', error);
        throw error;
      })
    );
  }

  approve(id: string, dto: ApproveExpenseRequestDto): Observable<ExpenseRequest | null> {
    return this.apiService.patch<ExpenseRequest>(`/expense-requests/${id}/approve`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error approving expense request:', error);
        throw error;
      })
    );
  }

  reject(id: string, dto: RejectExpenseRequestDto): Observable<ExpenseRequest | null> {
    return this.apiService.patch<ExpenseRequest>(`/expense-requests/${id}/reject`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error rejecting expense request:', error);
        throw error;
      })
    );
  }

  /** Cancel my own PENDING request (owner only). */
  cancel(id: string): Observable<ExpenseRequest | null> {
    return this.apiService.patch<ExpenseRequest>(`/expense-requests/${id}/cancel`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error cancelling expense request:', error);
        throw error;
      })
    );
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  private buildQueryParams(params?: ExpenseRequestQueryParams): string {
    if (!params) return '';
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', String(params.page));
    if (params.limit) qp.append('limit', String(params.limit));
    if (params.sortBy) qp.append('sortBy', params.sortBy);
    if (params.sortOrder) qp.append('sortOrder', params.sortOrder);
    if (params.search) qp.append('search', params.search);
    if (params.status) qp.append('status', params.status);
    if (params.categoryId) qp.append('categoryId', params.categoryId);
    if (params.requestedById) qp.append('requestedById', params.requestedById);
    if (params.residentId) qp.append('residentId', params.residentId);
    if (params.dateFrom) qp.append('dateFrom', params.dateFrom);
    if (params.dateTo) qp.append('dateTo', params.dateTo);
    const qs = qp.toString();
    return qs ? `?${qs}` : '';
  }

  /** Defensive pagination reshape (matches resident-payments.service.ts:36-46). */
  private reshapeList(response: any): ExpenseRequestListResponse {
    const paginatedData = response?.data || {};
    const data: ExpenseRequest[] = Array.isArray(paginatedData)
      ? paginatedData
      : paginatedData.data || [];
    const meta = response?.meta || paginatedData?.meta;
    return {
      data,
      total: meta?.total ?? data.length,
      page: meta?.page ?? 1,
      limit: meta?.limit ?? 10,
      totalPages: meta?.totalPages ?? 1,
    };
  }

  private emptyList(): ExpenseRequestListResponse {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}
