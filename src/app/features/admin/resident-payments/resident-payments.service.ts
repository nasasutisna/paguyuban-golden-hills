import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, ApiResponse } from '@core/api/api.service';
import {
  ResidentPayment,
  CreateResidentPaymentDto,
  UpdateResidentPaymentDto,
  ResidentPaymentListResponse,
  ResidentPaymentQueryParams,
  PaymentStats
} from './resident-payments.model';

/**
 * Resident Payments Service
 * Handles all API calls for resident payments CRUD operations
 */
@Injectable({
  providedIn: 'root'
})
export class ResidentPaymentsService {
  private apiService = inject(ApiService);

  /**
   * Get paginated list of resident payments
   * @param params - Query parameters for filtering, sorting, pagination
   */
  getAll(params?: ResidentPaymentQueryParams): Observable<ResidentPaymentListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/resident-payments${queryParams}`).pipe(
      map((response) => {
        const paginatedData = response.data || {};
        const data = Array.isArray(paginatedData) ? paginatedData : (paginatedData.data || []);
        const metadata = response?.meta;
        return {
          data: data,
          total: metadata?.total ?? data.length,
          page: metadata?.page ?? 1,
          limit: metadata?.limit ?? 10,
          totalPages: metadata?.totalPages ?? 1
        };
      }),
      catchError((error) => {
        console.error('Error fetching resident payments:', error);
        return of({
          data: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0
        });
      })
    );
  }

  /**
   * Get resident payment by ID
   * @param id - Payment ID
   */
  getById(id: string): Observable<ResidentPayment | null> {
    return this.apiService.get<ResidentPayment>(`/resident-payments/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching resident payment:', error);
        return of(null);
      })
    );
  }

  /**
   * Get payments by resident ID
   * @param residentId - Resident ID
   */
  getByResident(residentId: string): Observable<ResidentPayment[]> {
    return this.apiService.get<ResidentPayment[]>(`/resident-payments/resident/${residentId}`).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching payments by resident:', error);
        return of([]);
      })
    );
  }

  /**
   * Get payments by invoice ID
   * @param invoiceId - Invoice ID
   */
  getByInvoice(invoiceId: string): Observable<ResidentPayment[]> {
    return this.apiService.get<ResidentPayment[]>(`/resident-payments/invoice/${invoiceId}`).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching payments by invoice:', error);
        return of([]);
      })
    );
  }

  /**
   * Create new resident payment
   * @param dto - Create resident payment DTO
   */
  create(dto: CreateResidentPaymentDto): Observable<ResidentPayment | null> {
    return this.apiService.post<ResidentPayment>('/resident-payments', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating resident payment:', error);
        throw error;
      })
    );
  }

  /**
   * Update resident payment
   * @param id - Payment ID
   * @param dto - Update resident payment DTO
   */
  update(id: string, dto: UpdateResidentPaymentDto): Observable<ResidentPayment | null> {
    return this.apiService.patch<ResidentPayment>(`/resident-payments/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating resident payment:', error);
        throw error;
      })
    );
  }

  /**
   * Delete resident payment (soft delete)
   * @param id - Payment ID
   */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`/resident-payments/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting resident payment:', error);
        throw error;
      })
    );
  }

  /**
   * Get payment statistics
   */
  getPaymentStats(): Observable<PaymentStats> {
    return this.apiService.get<PaymentStats>('/resident-payments/stats').pipe(
      map((response) => response.data || this.getDefaultStats()),
      catchError((error) => {
        console.error('Error fetching payment stats:', error);
        return of(this.getDefaultStats());
      })
    );
  }

  /**
   * Build query parameters string from object
   */
  private buildQueryParams(params?: ResidentPaymentQueryParams): string {
    if (!params) {
      return '';
    }

    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.search) queryParams.append('search', params.search);
    if (params.searchFields) queryParams.append('searchFields', params.searchFields);
    if (params.filters) queryParams.append('filters', params.filters);
    if (params.fields) queryParams.append('fields', params.fields);

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Get default/empty statistics
   */
  private getDefaultStats(): PaymentStats {
    return {
      total: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      cancelled: 0,
      totalAmount: 0,
      todayAmount: 0,
      thisMonthAmount: 0
    };
  }
}
