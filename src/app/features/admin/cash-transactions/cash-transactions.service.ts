/**
 * Cash Transactions Service
 * Handles API calls for cash transaction management
 */

import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';

import {
  CashTransaction,
  CreateCashTransactionDto,
  UpdateCashTransactionDto,
  CashTransactionsResponse,
  CashTransactionQueryParams,
  TransactionSummary,
  TransactionCategory,
  TransactionType,
  ReportStatistics
} from './cash-transactions.model';

@Injectable({
  providedIn: 'root'
})
export class CashTransactionsService {
  private apiService = inject(ApiService);
  private readonly cashTransactionsPath = '/cash-transactions';
  private readonly categoriesPath = '/transaction-categories';

  /**
   * Get paginated list of cash transactions
   */
  getAll(params?: CashTransactionQueryParams): Observable<CashTransactionsResponse> {
    const queryParams = this.buildQueryParams(params);
    console.log('[CashTransactionsService] Fetching:', `${this.cashTransactionsPath}${queryParams}`);

    return this.apiService.get<any>(`${this.cashTransactionsPath}${queryParams}`).pipe(
      map((response) => {
        console.log('[CashTransactionsService] Raw response:', response);
        const paginatedData = response.data || [];
        const metadata = response?.meta;

        console.log('[CashTransactionsService] paginatedData length:', paginatedData.length);
        console.log('[CashTransactionsService] First raw item:', paginatedData[0]);

        // Map API response to match model
        const data = paginatedData.map((item: any) => {
          const mapped = {
            id: item.id,
            transactionNumber: item.transactionNumber,
            transactionDate: item.transactionDate,
            transactionType: item.transactionType,
            category: item.category,
            categoryId: item.categoryId,
            amount: typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount,
            paymentMethod: item.paymentMethod || 'CASH', // Default to CASH if not provided
            referenceType: item.referenceType,
            referenceId: item.referenceId,
            referenceNumber: item.referenceNumber,
            description: item.description,
            notes: item.notes,
            // Map 'status' from API to 'approvalStatus' in model
            approvalStatus: item.status || item.approvalStatus,
            requiresApproval: item.requiresApproval !== undefined ? item.requiresApproval : false,
            approvedBy: item.approvedBy,
            approvedAt: item.approvedAt,
            ipAddress: item.ipAddress,
            userAgent: item.userAgent,
            createdBy: item.createdBy,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          };
          return mapped;
        });

        const result = {
          data: data,
          total: metadata?.total ?? data.length,
          page: metadata?.page ?? 1,
          limit: metadata?.limit ?? 10,
          totalPages: metadata?.totalPages ?? 1
        };

        console.log('[CashTransactionsService] Mapped data length:', data.length);
        console.log('[CashTransactionsService] First mapped item:', data[0]);
        console.log('[CashTransactionsService] Returning result:', result);

        return result;
      }),
      catchError((error) => {
        console.error('[CashTransactionsService] Error fetching cash transactions:', error);
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
   * Build query parameters string from object
   */
  private buildQueryParams(params?: CashTransactionQueryParams): string {
    if (!params) {
      return '';
    }

    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.transactionType) queryParams.append('transactionType', params.transactionType);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.paymentMethod) queryParams.append('paymentMethod', params.paymentMethod);
    if (params.approvalStatus) queryParams.append('approvalStatus', params.approvalStatus);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Get single cash transaction by ID
   */
  getById(id: string): Observable<CashTransaction | null> {
    return this.apiService.get<CashTransaction>(`${this.cashTransactionsPath}/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching cash transaction:', error);
        return of(null);
      })
    );
  }

  /**
   * Create new cash transaction
   */
  create(dto: CreateCashTransactionDto): Observable<CashTransaction | null> {
    return this.apiService.post<CashTransaction>(this.cashTransactionsPath, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating cash transaction:', error);
        throw error;
      })
    );
  }

  /**
   * Update existing cash transaction
   */
  update(id: string, dto: UpdateCashTransactionDto): Observable<CashTransaction | null> {
    return this.apiService.patch<CashTransaction>(`${this.cashTransactionsPath}/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating cash transaction:', error);
        throw error;
      })
    );
  }

  /**
   * Delete cash transaction
   */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`${this.cashTransactionsPath}/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting cash transaction:', error);
        throw error;
      })
    );
  }

  /**
   * Approve transaction
   */
  approve(id: string): Observable<CashTransaction | null> {
    return this.apiService.post<CashTransaction>(`${this.cashTransactionsPath}/${id}/approve`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error approving transaction:', error);
        throw error;
      })
    );
  }

  /**
   * Reject transaction
   */
  reject(id: string, reason?: string): Observable<CashTransaction | null> {
    return this.apiService.post<CashTransaction>(`${this.cashTransactionsPath}/${id}/reject`, { reason }).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error rejecting transaction:', error);
        throw error;
      })
    );
  }

  /**
   * Get transaction summary
   */
  getSummary(startDate?: string, endDate?: string): Observable<TransactionSummary> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.cashTransactionsPath}/summary?${queryString}` : `${this.cashTransactionsPath}/summary`;

    return this.apiService.get<TransactionSummary>(endpoint).pipe(
      map((response) => response.data || this.getDefaultSummary()),
      catchError((error) => {
        console.error('Error fetching summary:', error);
        return of(this.getDefaultSummary());
      })
    );
  }

  /**
   * Get all transaction categories
   */
  getCategories(params?: { type?: TransactionType }): Observable<TransactionCategory[]> {
    const queryParams = new URLSearchParams();
    if (params?.type) {
      queryParams.append('type', params.type);
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.categoriesPath}?${queryString}` : this.categoriesPath;

    return this.apiService.get<TransactionCategory[]>(endpoint).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching categories:', error);
        return of([]);
      })
    );
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: string): Observable<TransactionCategory | null> {
    return this.apiService.get<TransactionCategory>(`${this.categoriesPath}/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching category:', error);
        return of(null);
      })
    );
  }

  /**
   * Get transactions filtered by reference type
   */
  getByReferenceType(referenceType: string, startDate?: string, endDate?: string): Observable<CashTransaction[]> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.cashTransactionsPath}/reference-type/${referenceType}?${queryString}` : `${this.cashTransactionsPath}/reference-type/${referenceType}`;

    return this.apiService.get<CashTransaction[]>(endpoint).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching transactions by reference type:', error);
        return of([]);
      })
    );
  }

  /**
   * Get IPL report statistics
   */
  getIplReport(startDate?: string, endDate?: string): Observable<ReportStatistics> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.cashTransactionsPath}/reports/ipl?${queryString}` : `${this.cashTransactionsPath}/reports/ipl`;

    return this.apiService.get<ReportStatistics>(endpoint).pipe(
      map((response) => response.data || this.getDefaultReportStatistics()),
      catchError((error) => {
        console.error('Error fetching IPL report:', error);
        return of(this.getDefaultReportStatistics());
      })
    );
  }

  /**
   * Get Kegiatan report statistics
   */
  getKegiatanReport(startDate?: string, endDate?: string): Observable<ReportStatistics> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.cashTransactionsPath}/reports/kegiatan?${queryString}` : `${this.cashTransactionsPath}/reports/kegiatan`;

    return this.apiService.get<ReportStatistics>(endpoint).pipe(
      map((response) => response.data || this.getDefaultReportStatistics()),
      catchError((error) => {
        console.error('Error fetching Kegiatan report:', error);
        return of(this.getDefaultReportStatistics());
      })
    );
  }

  /**
   * Export IPL report to Excel (.xlsx) and return the file as a Blob
   */
  exportIplReport(startDate?: string, endDate?: string): Observable<Blob> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `${this.cashTransactionsPath}/reports/ipl/export?${queryString}`
      : `${this.cashTransactionsPath}/reports/ipl/export`;

    return this.apiService.getBlob(endpoint);
  }

  /**
   * Export Kegiatan report to Excel (.xlsx) and return the file as a Blob
   */
  exportKegiatanReport(startDate?: string, endDate?: string): Observable<Blob> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `${this.cashTransactionsPath}/reports/kegiatan/export?${queryString}`
      : `${this.cashTransactionsPath}/reports/kegiatan/export`;

    return this.apiService.getBlob(endpoint);
  }

  /**
   * Get transactions by reference type with filtering
   */
  getTransactionsByReferenceType(params: {
    referenceType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Observable<CashTransactionsResponse> {
    const queryParams = new URLSearchParams();

    if (params.referenceType) queryParams.append('referenceType', params.referenceType);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.cashTransactionsPath}/by-reference-type?${queryString}` : `${this.cashTransactionsPath}/by-reference-type`;

    return this.apiService.get<any>(endpoint).pipe(
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
        console.error('Error fetching transactions by reference type:', error);
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
   * Get default/empty summary
   */
  private getDefaultSummary(): TransactionSummary {
    return {
      totalTransactions: 0,
      totalIncome: 0,
      totalExpense: 0,
      netAmount: 0,
      pendingApproval: 0
    };
  }

  /**
   * Get default/empty report statistics
   */
  private getDefaultReportStatistics(): ReportStatistics {
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      breakdownByCategory: []
    };
  }
}
