import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, ApiResponse } from '@core/api/api.service';
import {
  FeeType,
  CreateFeeTypeDto,
  UpdateFeeTypeDto,
  FeeTypeListResponse,
  FeeTypeQueryParams
} from './fee-types.model';

/**
 * Fee Types Service
 * Handles all API calls for fee types CRUD operations
 */
@Injectable({
  providedIn: 'root'
})
export class FeeTypesService {
  private apiService = inject(ApiService);

  /**
   * Get paginated list of fee types
   * @param params - Query parameters for filtering, sorting, pagination
   */
  getAll(params?: FeeTypeQueryParams): Observable<FeeTypeListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/fee-types${queryParams}`).pipe(
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
        console.error('Error fetching fee types:', error);
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
   * Get fee type by ID
   * @param id - Fee Type ID
   */
  getById(id: string): Observable<FeeType | null> {
    return this.apiService.get<FeeType>(`/fee-types/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching fee type:', error);
        return of(null);
      })
    );
  }

  /**
   * Get active fee types only
   */
  getActive(): Observable<FeeType[]> {
    return this.apiService.get<FeeType[]>('/fee-types/active').pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching active fee types:', error);
        return of([]);
      })
    );
  }

  /**
   * Create new fee type
   * @param dto - Create fee type DTO
   */
  create(dto: CreateFeeTypeDto): Observable<FeeType | null> {
    return this.apiService.post<FeeType>('/fee-types', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating fee type:', error);
        throw error;
      })
    );
  }

  /**
   * Update fee type
   * @param id - Fee Type ID
   * @param dto - Update fee type DTO
   */
  update(id: string, dto: UpdateFeeTypeDto): Observable<FeeType | null> {
    return this.apiService.patch<FeeType>(`/fee-types/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating fee type:', error);
        throw error;
      })
    );
  }

  /**
   * Delete fee type (soft delete)
   * @param id - Fee Type ID
   */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`/fee-types/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting fee type:', error);
        throw error;
      })
    );
  }

  /**
   * Build query parameters string from object
   */
  private buildQueryParams(params?: FeeTypeQueryParams): string {
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
}
