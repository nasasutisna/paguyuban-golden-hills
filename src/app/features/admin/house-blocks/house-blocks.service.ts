import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, ApiResponse } from '@core/api/api.service';
import {
  HouseBlock,
  CreateHouseBlockDto,
  UpdateHouseBlockDto,
  HouseBlockListResponse,
  OccupancyStats,
  HouseBlockQueryParams
} from './house-blocks.model';

/**
 * House Blocks Service
 * Handles all API calls for house blocks CRUD operations
 */
@Injectable({
  providedIn: 'root'
})
export class HouseBlocksService {
  private apiService = inject(ApiService);

  /**
   * Get paginated list of house blocks
   * @param params - Query parameters for filtering, sorting, pagination
   */
  getAll(params?: HouseBlockQueryParams): Observable<HouseBlockListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/house-blocks${queryParams}`).pipe(
      map((response) => {
        // API response structure: { data: [...], total, page, limit, totalPages }
        // Handle both nested (data.data) and flat (data) structures
        const paginatedData = response.data || {};
        const data = Array.isArray(paginatedData) ? paginatedData : (paginatedData.data || []);
        const metadata = response?.meta
        return {
          data: data,
          total: metadata?.total ?? data.length,
          page: metadata?.page ?? 1,
          limit: metadata?.limit ?? 10,
          totalPages: metadata?.totalPages ?? 1
        };
      }),
      catchError((error) => {
        console.error('Error fetching house blocks:', error);
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
   * Get house block by ID
   * @param id - House block ID
   */
  getById(id: string): Observable<HouseBlock | null> {
    return this.apiService.get<HouseBlock>(`/house-blocks/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching house block:', error);
        return of(null);
      })
    );
  }

  /**
   * Create new house block
   * @param dto - Create house block DTO
   */
  create(dto: CreateHouseBlockDto): Observable<HouseBlock | null> {
    return this.apiService.post<HouseBlock>('/house-blocks', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating house block:', error);
        throw error;
      })
    );
  }

  /**
   * Update house block
   * @param id - House block ID
   * @param dto - Update house block DTO
   */
  update(id: string, dto: UpdateHouseBlockDto): Observable<HouseBlock | null> {
    return this.apiService.patch<HouseBlock>(`/house-blocks/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating house block:', error);
        throw error;
      })
    );
  }

  /**
   * Delete house block (soft delete)
   * @param id - House block ID
   */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`/house-blocks/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting house block:', error);
        throw error;
      })
    );
  }

  /**
   * Get occupancy statistics
   */
  getOccupancyStats(): Observable<OccupancyStats> {
    return this.apiService.get<OccupancyStats>('/house-blocks/occupancy/stats').pipe(
      map((response) => response.data || this.getDefaultStats()),
      catchError((error) => {
        console.error('Error fetching occupancy stats:', error);
        return of(this.getDefaultStats());
      })
    );
  }

  /**
   * Build query parameters string from object
   */
  private buildQueryParams(params?: HouseBlockQueryParams): string {
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
  private getDefaultStats(): OccupancyStats {
    return {
      totalBlocks: 0,
      activeBlocks: 0,
      inactiveBlocks: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      occupancyRate: 0,
      averageOccupancyPerBlock: 0
    };
  }
}
