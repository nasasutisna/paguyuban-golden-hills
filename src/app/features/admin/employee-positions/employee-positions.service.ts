import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import {
  EmployeePosition,
  EmployeePositionListResponse,
  EmployeePositionQueryParams
} from './employee-positions.model';

/**
 * Employee Positions Service
 * Lookup service used to populate the position dropdown in the employee form.
 * Only exposes the read endpoints needed for selection.
 */
@Injectable({
  providedIn: 'root'
})
export class EmployeePositionsService {
  private apiService = inject(ApiService);

  /**
   * Get paginated list of employee positions
   * @param params - Query parameters for filtering, sorting, pagination
   */
  getAll(params?: EmployeePositionQueryParams): Observable<EmployeePositionListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/employee-positions${queryParams}`).pipe(
      map((response) => {
        // API response structure: { data: [...], meta: { total, page, limit, totalPages } }
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
        console.error('Error fetching employee positions:', error);
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
   * Get employee position by ID
   * @param id - Employee Position ID
   */
  getById(id: string): Observable<EmployeePosition | null> {
    return this.apiService.get<EmployeePosition>(`/employee-positions/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching employee position:', error);
        return of(null);
      })
    );
  }

  /**
   * Build query parameters string from object
   */
  private buildQueryParams(params?: EmployeePositionQueryParams): string {
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

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}
