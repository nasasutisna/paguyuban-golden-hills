import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, ApiResponse } from '@core/api/api.service';
import {
  Resident,
  CreateResidentDto,
  UpdateResidentDto,
  ResidentListResponse,
  ResidentStats,
  ResidentQueryParams
} from './residents.model';

/**
 * Residents Service
 * Handles all API calls for residents CRUD operations
 */
@Injectable({
  providedIn: 'root'
})
export class ResidentsService {
  private apiService = inject(ApiService);

  /**
   * Get paginated list of residents
   * @param params - Query parameters for filtering, sorting, pagination
   */
  getAll(params?: ResidentQueryParams): Observable<ResidentListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/residents${queryParams}`).pipe(
      map((response) => {
        // API response structure: { data: [...], total, page, limit, totalPages }
        // Handle both nested (data.data) and flat (data) structures
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
        console.error('Error fetching residents:', error);
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
   * Get resident by ID
   * @param id - Resident ID
   */
  getById(id: string): Observable<Resident | null> {
    return this.apiService.get<Resident>(`/residents/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching resident:', error);
        return of(null);
      })
    );
  }

  /**
   * Get residents by house block ID
   * @param houseBlockId - House Block ID
   */
  getByHouseBlock(houseBlockId: string): Observable<Resident[]> {
    return this.apiService.get<Resident[]>(`/residents/house-block/${houseBlockId}`).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching residents by house block:', error);
        return of([]);
      })
    );
  }

  /**
   * Get active residents count
   */
  getActiveCount(): Observable<number> {
    return this.apiService.get<number>('/residents/active/count').pipe(
      map((response) => response.data || 0),
      catchError((error) => {
        console.error('Error fetching active residents count:', error);
        return of(0);
      })
    );
  }

  /**
   * Create new resident
   * @param dto - Create resident DTO
   */
  create(dto: CreateResidentDto): Observable<Resident | null> {
    return this.apiService.post<Resident>('/residents', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating resident:', error);
        throw error;
      })
    );
  }

  /**
   * Update resident
   * @param id - Resident ID
   * @param dto - Update resident DTO
   */
  update(id: string, dto: UpdateResidentDto): Observable<Resident | null> {
    return this.apiService.patch<Resident>(`/residents/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating resident:', error);
        throw error;
      })
    );
  }

  /**
   * Delete resident (soft delete)
   * @param id - Resident ID
   */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`/residents/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting resident:', error);
        throw error;
      })
    );
  }

  /**
   * Restore soft deleted resident
   * @param id - Resident ID
   */
  restore(id: string): Observable<Resident | null> {
    return this.apiService.patch<Resident>(`/residents/${id}/restore`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error restoring resident:', error);
        throw error;
      })
    );
  }

  /**
   * Get resident statistics
   */
  getResidentStats(): Observable<ResidentStats> {
    return this.apiService.get<ResidentStats>('/residents/stats').pipe(
      map((response) => response.data || this.getDefaultStats()),
      catchError((error) => {
        console.error('Error fetching resident stats:', error);
        return of(this.getDefaultStats());
      })
    );
  }

  /**
   * Build query parameters string from object
   */
  private buildQueryParams(params?: ResidentQueryParams): string {
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
  private getDefaultStats(): ResidentStats {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      ownership: {
        owners: 0,
        renters: 0
      },
      gender: {
        male: 0,
        female: 0,
        other: 0
      },
      maritalStatus: {
        single: 0,
        married: 0,
        divorced: 0,
        widowed: 0
      }
    };
  }
}
