/**
 * Cash Transactions Service
 * Handles API calls for cash transaction management
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

import {
  CashTransaction,
  CreateCashTransactionDto,
  UpdateCashTransactionDto,
  CashTransactionsResponse,
  CashTransactionQueryParams,
  TransactionSummary,
  TransactionCategory,
  TransactionType
} from './cash-transactions.model';

@Injectable({
  providedIn: 'root'
})
export class CashTransactionsService {
  private readonly apiUrl = `${environment.apiUrl}/cash-transactions`;
  private readonly categoriesUrl = `${environment.apiUrl}/transaction-categories`;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of cash transactions
   */
  getAll(params?: CashTransactionQueryParams): Observable<CashTransactionsResponse> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach((key) => {
        const value = params[key as keyof CashTransactionQueryParams];
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http.get<CashTransactionsResponse>(this.apiUrl, { params: httpParams });
  }

  /**
   * Get single cash transaction by ID
   */
  getById(id: string): Observable<CashTransaction> {
    return this.http.get<CashTransaction>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new cash transaction
   */
  create(dto: CreateCashTransactionDto): Observable<CashTransaction> {
    return this.http.post<CashTransaction>(this.apiUrl, dto);
  }

  /**
   * Update existing cash transaction
   */
  update(id: string, dto: UpdateCashTransactionDto): Observable<CashTransaction> {
    return this.http.patch<CashTransaction>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Delete cash transaction
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Approve transaction
   */
  approve(id: string): Observable<CashTransaction> {
    return this.http.post<CashTransaction>(`${this.apiUrl}/${id}/approve`, {});
  }

  /**
   * Reject transaction
   */
  reject(id: string, reason?: string): Observable<CashTransaction> {
    return this.http.post<CashTransaction>(`${this.apiUrl}/${id}/reject`, { reason });
  }

  /**
   * Get transaction summary
   */
  getSummary(startDate?: string, endDate?: string): Observable<TransactionSummary> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<TransactionSummary>(`${this.apiUrl}/summary`, { params });
  }

  /**
   * Get all transaction categories
   */
  getCategories(params?: { type?: TransactionType }): Observable<TransactionCategory[]> {
    let httpParams = new HttpParams();
    if (params?.type) {
      httpParams = httpParams.set('type', params.type);
    }

    return this.http.get<TransactionCategory[]>(this.categoriesUrl, { params: httpParams });
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: string): Observable<TransactionCategory> {
    return this.http.get<TransactionCategory>(`${this.categoriesUrl}/${id}`);
  }
}
