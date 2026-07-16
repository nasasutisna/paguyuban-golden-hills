import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, ApiResponse } from '@core/api/api.service';
import {
  IplPayment,
  CreateIplPaymentDto,
  UpdateIplPaymentDto,
  ApproveIplPaymentDto,
  RejectIplPaymentDto,
  IplPaymentListResponse,
  IplPaymentQueryParams,
  IplPaymentStats,
  PaymentsByReferenceResponse
} from './ipl-payments.model';

/**
 * IPL Payments Service
 * Handles all API calls for IPL payment operations
 */
@Injectable({
  providedIn: 'root'
})
export class IplPaymentsService {
  private apiService = inject(ApiService);

  /**
   * Get paginated list of IPL payments
   * @param params - Query parameters for filtering, sorting, pagination
   */
  getAll(params?: IplPaymentQueryParams): Observable<IplPaymentListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/ipl-payments${queryParams}`).pipe(
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
        console.error('Error fetching IPL payments:', error);
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
   * Get IPL payment by ID
   * @param id - Payment ID
   */
  getById(id: string): Observable<IplPayment | null> {
    return this.apiService.get<IplPayment>(`/ipl-payments/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching IPL payment:', error);
        return of(null);
      })
    );
  }

  /**
   * Get payments for current coordinator's block
   * @param params - Query parameters
   */
  getMyBlockPayments(params?: IplPaymentQueryParams): Observable<IplPaymentListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/ipl-payments/my-block${queryParams}`).pipe(
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
        console.error('Error fetching block payments:', error);
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
   * Get pending payments (for admin approval)
   * @param params - Query parameters
   */
  getPending(params?: IplPaymentQueryParams): Observable<IplPaymentListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/ipl-payments/pending${queryParams}`).pipe(
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
        console.error('Error fetching pending payments:', error);
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
   * Get payments by resident ID
   * @param residentId - Resident ID
   * @param params - Query parameters
   */
  getByResident(residentId: string, params?: IplPaymentQueryParams): Observable<IplPaymentListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/ipl-payments/resident/${residentId}${queryParams}`).pipe(
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
        console.error('Error fetching payments by resident:', error);
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
   * Get payments by period ID
   * @param periodId - Period ID
   * @param params - Query parameters
   */
  getByPeriod(periodId: string, params?: IplPaymentQueryParams): Observable<IplPaymentListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/ipl-payments/period/${periodId}${queryParams}`).pipe(
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
        console.error('Error fetching payments by period:', error);
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
   * Create new IPL payment with file upload
   * @param dto - Create IPL payment DTO with file
   */
  create(dto: CreateIplPaymentDto): Observable<IplPayment | null> {
    // If file is present, use FormData
    if (dto.proofFile) {
      const formData = new FormData();

      // Add file
      formData.append('proofFile', dto.proofFile);

      // Add required fields
      formData.append('periodId', dto.periodId);
      formData.append('residentId', dto.residentId);
      formData.append('monthCount', dto.monthCount?.toString() || '1');
      formData.append('paymentDate', dto.paymentDate);
      formData.append('paymentMethod', dto.paymentMethod);

      // Add optional fields
      if (dto.kegiatanAmount) {
        formData.append('kegiatanAmount', dto.kegiatanAmount.toString());
      }
      if (dto.notes) {
        formData.append('notes', dto.notes);
      }
      // Note: referenceNumber is now auto-generated by backend

      return this.apiService.post<IplPayment>('/ipl-payments', formData).pipe(
        map((response) => response.data || null),
        catchError((error) => {
          console.error('Error creating IPL payment:', error);
          throw error;
        })
      );
    }

    // No file - regular JSON request
    const { proofFile, ...dtoWithoutFile } = dto;
    return this.apiService.post<IplPayment>('/ipl-payments', dtoWithoutFile).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating IPL payment:', error);
        throw error;
      })
    );
  }

  /**
   * Update IPL payment
   * @param id - Payment ID
   * @param dto - Update DTO
   */
  update(id: string, dto: UpdateIplPaymentDto): Observable<IplPayment | null> {
    return this.apiService.patch<IplPayment>(`/ipl-payments/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating IPL payment:', error);
        throw error;
      })
    );
  }

  /**
   * Approve IPL payment
   * @param id - Payment ID
   * @param dto - Approval DTO
   */
  approve(id: string, dto: ApproveIplPaymentDto): Observable<IplPayment | null> {
    return this.apiService.patch<IplPayment>(`/ipl-payments/${id}/approve`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error approving payment:', error);
        throw error;
      })
    );
  }

  /**
   * Reject IPL payment
   * @param id - Payment ID
   * @param dto - Rejection DTO
   */
  reject(id: string, dto: RejectIplPaymentDto): Observable<IplPayment | null> {
    return this.apiService.patch<IplPayment>(`/ipl-payments/${id}/reject`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error rejecting payment:', error);
        throw error;
      })
    );
  }

  /**
   * Delete IPL payment (soft delete)
   * @param id - Payment ID
   */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`/ipl-payments/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting IPL payment:', error);
        throw error;
      })
    );
  }

  /**
   * Get payments by reference number
   * Returns all IPL and kegiatan payments for a single transfer
   * @param referenceNumber - Reference number (e.g., REF-20250114-0001)
   */
  getByReferenceNumber(referenceNumber: string): Observable<PaymentsByReferenceResponse | null> {
    return this.apiService.get<PaymentsByReferenceResponse>(`/ipl-payments/by-reference/${referenceNumber}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching payments by reference:', error);
        return of(null);
      })
    );
  }

  /**
   * Get IPL payment statistics
   */
  getStats(): Observable<IplPaymentStats> {
    return this.apiService.get<IplPaymentStats>('/ipl-payments/stats').pipe(
      map((response) => response.data || this.getDefaultStats()),
      catchError((error) => {
        console.error('Error fetching stats:', error);
        return of(this.getDefaultStats());
      })
    );
  }

  /**
   * Build query parameters string from object
   */
  private buildQueryParams(params?: IplPaymentQueryParams): string {
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
    if (params.status) queryParams.append('status', params.status);
    if (params.periodId) queryParams.append('periodId', params.periodId);
    if (params.residentId) queryParams.append('residentId', params.residentId);
    if (params.houseBlockId) queryParams.append('houseBlockId', params.houseBlockId);
    if (params.submittedBy) queryParams.append('submittedBy', params.submittedBy);

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Get default/empty statistics
   */
  private getDefaultStats(): IplPaymentStats {
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmount: 0,
      approvedAmount: 0,
      pendingAmount: 0
    };
  }

  /**
   * Get receipt URL for IPL payment
   * @param id - Payment ID
   * @deprecated Use getReceipt() instead to get receipt info
   */
  getReceiptUrl(id: string): string {
    return `${this.apiService.getBaseUrl()}/ipl-payments/${id}/receipt`;
  }

  /**
   * Get receipt info for IPL payment
   * Returns file information including URL
   * @param id - Payment ID
   */
  getReceipt(id: string): Observable<ReceiptInfo | null> {
    return this.apiService.get<ReceiptInfo>(`/ipl-payments/${id}/receipt`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching receipt:', error);
        return of(null);
      })
    );
  }

  /**
   * Download receipt for IPL payment
   * @param id - Payment ID
   * @deprecated - receipts are now viewed/linked, not directly downloaded
   */
  downloadReceipt(id: string): void {
    // First get receipt info to get the correct URL
    this.getReceipt(id).subscribe({
      next: (receipt) => {
        if (receipt && receipt.url) {
          window.open(receipt.url, '_blank');
        } else {
          console.error('Receipt not available');
        }
      },
      error: (error) => {
        console.error('Error downloading receipt:', error);
      }
    });
  }
}

/**
 * Receipt Info interface
 */
export interface ReceiptInfo {
  id: string;
  fileName: string;
  filePath: string;
  url: string;
  fileSize: number;
  mimeType: string;
  category: string;
  paymentNumber: string;
  paymentId: string;
}
