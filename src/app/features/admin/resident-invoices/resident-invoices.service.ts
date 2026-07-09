import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, ApiResponse } from '@core/api/api.service';
import {
  ResidentInvoice,
  CreateResidentInvoiceDto,
  UpdateResidentInvoiceDto,
  ResidentInvoiceListResponse,
  ResidentInvoiceQueryParams,
  InvoiceStats
} from './resident-invoices.model';

/**
 * Resident Invoices Service
 * Handles all API calls for resident invoices CRUD operations
 */
@Injectable({
  providedIn: 'root'
})
export class ResidentInvoicesService {
  private apiService = inject(ApiService);

  /**
   * Get paginated list of resident invoices
   * @param params - Query parameters for filtering, sorting, pagination
   */
  getAll(params?: ResidentInvoiceQueryParams): Observable<ResidentInvoiceListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/resident-invoices${queryParams}`).pipe(
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
        console.error('Error fetching resident invoices:', error);
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
   * Get resident invoice by ID
   * @param id - Invoice ID
   */
  getById(id: string): Observable<ResidentInvoice | null> {
    return this.apiService.get<ResidentInvoice>(`/resident-invoices/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching resident invoice:', error);
        return of(null);
      })
    );
  }

  /**
   * Get invoices by resident ID
   * @param residentId - Resident ID
   */
  getByResident(residentId: string): Observable<ResidentInvoice[]> {
    return this.apiService.get<ResidentInvoice[]>(`/resident-invoices/resident/${residentId}`).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching invoices by resident:', error);
        return of([]);
      })
    );
  }

  /**
   * Get pending invoices
   */
  getPending(): Observable<ResidentInvoice[]> {
    return this.apiService.get<ResidentInvoice[]>('/resident-invoices/pending').pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching pending invoices:', error);
        return of([]);
      })
    );
  }

  /**
   * Get overdue invoices
   */
  getOverdue(): Observable<ResidentInvoice[]> {
    return this.apiService.get<ResidentInvoice[]>('/resident-invoices/overdue').pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching overdue invoices:', error);
        return of([]);
      })
    );
  }

  /**
   * Create new resident invoice
   * @param dto - Create resident invoice DTO
   */
  create(dto: CreateResidentInvoiceDto): Observable<ResidentInvoice | null> {
    return this.apiService.post<ResidentInvoice>('/resident-invoices', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating resident invoice:', error);
        throw error;
      })
    );
  }

  /**
   * Update resident invoice
   * @param id - Invoice ID
   * @param dto - Update resident invoice DTO
   */
  update(id: string, dto: UpdateResidentInvoiceDto): Observable<ResidentInvoice | null> {
    return this.apiService.patch<ResidentInvoice>(`/resident-invoices/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating resident invoice:', error);
        throw error;
      })
    );
  }

  /**
   * Delete resident invoice (soft delete)
   * @param id - Invoice ID
   */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`/resident-invoices/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting resident invoice:', error);
        throw error;
      })
    );
  }

  /**
   * Get invoice statistics
   */
  getInvoiceStats(): Observable<InvoiceStats> {
    return this.apiService.get<InvoiceStats>('/resident-invoices/stats').pipe(
      map((response) => response.data || this.getDefaultStats()),
      catchError((error) => {
        console.error('Error fetching invoice stats:', error);
        return of(this.getDefaultStats());
      })
    );
  }

  /**
   * Build query parameters string from object
   */
  private buildQueryParams(params?: ResidentInvoiceQueryParams): string {
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
  private getDefaultStats(): InvoiceStats {
    return {
      total: 0,
      draft: 0,
      pending: 0,
      paid: 0,
      partial: 0,
      overdue: 0,
      cancelled: 0,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0
    };
  }
}
