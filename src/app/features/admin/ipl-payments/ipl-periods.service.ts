import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, ApiResponse } from '@core/api/api.service';
import {
  IplPeriod,
  CreateIplPeriodDto,
  UpdateIplPeriodDto,
  IplPeriodListResponse,
  IplPeriodQueryParams,
  IplPeriodWithStats,
  IplPeriodWithStatsListResponse,
  GenerateIplPeriodsDto,
  GenerateIplPeriodsResult
} from './ipl-payments.model';

/**
 * IPL Periods Service
 * Handles all API calls for IPL period management
 */
@Injectable({
  providedIn: 'root'
})
export class IplPeriodsService {
  private apiService = inject(ApiService);

  /**
   * Get paginated list of IPL periods
   * @param params - Query parameters for filtering, sorting, pagination
   */
  getAll(params?: IplPeriodQueryParams): Observable<IplPeriodListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/ipl-periods${queryParams}`).pipe(
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
        console.error('Error fetching IPL periods:', error);
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
   * Get IPL period by ID
   * @param id - Period ID
   */
  getById(id: string): Observable<IplPeriod | null> {
    return this.apiService.get<IplPeriod>(`/ipl-periods/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching IPL period:', error);
        return of(null);
      })
    );
  }

  /**
   * Get active periods only
   */
  getActive(): Observable<IplPeriod[]> {
    return this.apiService.get<IplPeriod[]>('/ipl-periods/active').pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching active periods:', error);
        return of([]);
      })
    );
  }

  /**
   * Get periods with statistics (paginated, server-side pagination)
   * @param params - Query parameters (page, limit, filters, sort)
   */
  getWithStats(params?: IplPeriodQueryParams): Observable<IplPeriodWithStatsListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/ipl-periods/with-stats${queryParams}`).pipe(
      map((response) => {
        const paginatedData = response.data ?? {};
        const data: IplPeriodWithStats[] = Array.isArray(paginatedData)
          ? paginatedData
          : (paginatedData.data ?? []);
        const metadata = response?.meta;
        return {
          data,
          total: metadata?.total ?? data.length,
          page: metadata?.page ?? 1,
          limit: metadata?.limit ?? 10,
          totalPages: metadata?.totalPages ?? (data.length > 0 ? 1 : 0),
        };
      }),
      catchError((error) => {
        console.error('Error fetching periods with stats:', error);
        return of({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      })
    );
  }

  /**
   * Get period by period code
   * @param periodCode - Period code (e.g., "JUL-2026")
   */
  getByCode(periodCode: string): Observable<IplPeriod | null> {
    return this.apiService.get<IplPeriod>(`/ipl-periods/code/${periodCode}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching period by code:', error);
        return of(null);
      })
    );
  }

  /**
   * Create new IPL period
   * @param dto - Create IPL period DTO
   */
  create(dto: CreateIplPeriodDto): Observable<IplPeriod | null> {
    return this.apiService.post<IplPeriod>('/ipl-periods', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating IPL period:', error);
        throw error;
      })
    );
  }

  /**
   * Generate all 12 monthly periods (Jan-Dec) for a given year in one request.
   * Existing months are skipped. @see POST /ipl-periods/generate
   * @param dto - { year, baseRate?, status?, dueDay? }
   */
  generateYear(dto: GenerateIplPeriodsDto): Observable<GenerateIplPeriodsResult | null> {
    return this.apiService.post<GenerateIplPeriodsResult>('/ipl-periods/generate', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error generating IPL periods:', error);
        throw error;
      })
    );
  }

  /**
   * Update IPL period
   * @param id - Period ID
   * @param dto - Update DTO
   */
  update(id: string, dto: UpdateIplPeriodDto): Observable<IplPeriod | null> {
    return this.apiService.patch<IplPeriod>(`/ipl-periods/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating IPL period:', error);
        throw error;
      })
    );
  }

  /**
   * Delete IPL period (soft delete)
   * @param id - Period ID
   */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`/ipl-periods/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting IPL period:', error);
        throw error;
      })
    );
  }

  /**
   * Close an IPL period
   * @param id - Period ID
   */
  closePeriod(id: string): Observable<IplPeriod | null> {
    return this.apiService.patch<IplPeriod>(`/ipl-periods/${id}/close`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error closing IPL period:', error);
        throw error;
      })
    );
  }

  /**
   * Reopen a closed IPL period
   * @param id - Period ID
   */
  reopenPeriod(id: string): Observable<IplPeriod | null> {
    return this.apiService.patch<IplPeriod>(`/ipl-periods/${id}/reopen`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error reopening IPL period:', error);
        throw error;
      })
    );
  }

  /**
   * Build query parameters string from object
   */
  private buildQueryParams(params?: IplPeriodQueryParams): string {
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
    if (params.year) queryParams.append('year', params.year.toString());
    if (params.month) queryParams.append('month', params.month.toString());

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}
