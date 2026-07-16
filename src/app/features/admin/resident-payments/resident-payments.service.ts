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
  PaymentStats,
  CreateBulkResidentPaymentDto,
  BulkPaymentResult,
  FileAttachment,
  ReceiptInfo
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
   * Create new resident payment (multipart/form-data when a proof file is attached)
   * @param dto - Create resident payment DTO (proofFile triggers FormData upload)
   */
  create(dto: CreateResidentPaymentDto): Observable<ResidentPayment | null> {
    // If a proof file is present, use FormData (backend FileInterceptor('proofFile'))
    if (dto.proofFile) {
      const formData = new FormData();

      // Attach the file under the field name expected by the backend
      formData.append('proofFile', dto.proofFile);

      // Required scalar fields
      formData.append('residentId', dto.residentId);
      formData.append('paymentDate', dto.paymentDate);
      formData.append('paymentMethod', dto.paymentMethod);
      formData.append('amount', dto.amount.toString());

      // Optional scalar fields
      if (dto.invoiceId) {
        formData.append('invoiceId', dto.invoiceId);
      }
      if (dto.paymentChannel) {
        formData.append('paymentChannel', dto.paymentChannel);
      }
      if (dto.referenceNumber) {
        formData.append('referenceNumber', dto.referenceNumber);
      }
      if (dto.bankName) {
        formData.append('bankName', dto.bankName);
      }
      if (dto.accountNumber) {
        formData.append('accountNumber', dto.accountNumber);
      }
      if (dto.notes) {
        formData.append('notes', dto.notes);
      }

      return this.apiService.post<ResidentPayment>('/resident-payments', formData).pipe(
        map((response) => response.data || null),
        catchError((error) => {
          console.error('Error creating resident payment:', error);
          throw error;
        })
      );
    }

    // No file — regular JSON request
    const { proofFile, ...dtoWithoutFile } = dto;
    return this.apiService.post<ResidentPayment>('/resident-payments', dtoWithoutFile).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating resident payment:', error);
        throw error;
      })
    );
  }

  /**
   * Verify (complete) a resident payment.
   * Triggers async kwitansi generation + ledger entry on the backend.
   * @param id - Payment ID
   */
  verify(id: string): Observable<ResidentPayment | null> {
    return this.apiService.patch<ResidentPayment>(`/resident-payments/${id}/verify`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error verifying resident payment:', error);
        throw error;
      })
    );
  }

  /**
   * Get kwitansi (receipt) info for a COMPLETED payment.
   * Backend throws 400 if the payment is not yet COMPLETED.
   * @param id - Payment ID
   */
  getReceipt(id: string): Observable<ReceiptInfo | null> {
    return this.apiService.get<ReceiptInfo>(`/resident-payments/${id}/receipt`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching receipt:', error);
        return of(null);
      })
    );
  }

  /**
   * Get all FileAttachments (bukti transfer, receipt) for a resident payment.
   * Used by the detail page to display the uploaded proof file, since GET /:id does not embed files.
   * @param id - Payment ID
   */
  getFilesByEntity(id: string): Observable<FileAttachment[]> {
    return this.apiService.get<FileAttachment[]>(`/file-attachments/entity/ResidentPayment/${id}`).pipe(
      map((response) => {
        const data = response?.data;
        return Array.isArray(data) ? data : [];
      }),
      catchError((error) => {
        console.error('Error fetching payment files:', error);
        return of([]);
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

  /**
   * Create bulk payments
   * @param dto - Create bulk resident payment DTO
   */
  createBulk(dto: CreateBulkResidentPaymentDto): Observable<BulkPaymentResult> {
    return this.apiService.post<BulkPaymentResult>('/resident-payments/bulk', dto).pipe(
      map((response) => response.data || {
        successful: [],
        failed: [],
        total: 0,
        successCount: 0,
        failureCount: 0
      }),
      catchError((error) => {
        console.error('Error creating bulk resident payments:', error);
        throw error;
      })
    );
  }
}
