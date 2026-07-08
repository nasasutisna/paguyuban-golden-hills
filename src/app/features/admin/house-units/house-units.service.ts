import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, ApiResponse } from '@core/api/api.service';
import {
  HouseUnit,
  CreateHouseUnitDto,
  UpdateHouseUnitDto,
  HouseUnitListResponse,
  HouseUnitOccupancyStats,
  HouseUnitQueryParams
} from './house-units.model';

/**
 * House Units Service
 * Handles all API calls for house units CRUD operations
 */
@Injectable({
  providedIn: 'root'
})
export class HouseUnitsService {
  private apiService = inject(ApiService);

  /**
   * Get paginated list of house units
   * @param params - Query parameters for filtering, sorting, pagination
   */
  getAll(params?: HouseUnitQueryParams): Observable<HouseUnitListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/house-units${queryParams}`).pipe(
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
        console.error('Error fetching house units:', error);
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
   * Get house unit by ID
   * @param id - House unit ID
   */
  getById(id: string): Observable<HouseUnit | null> {
    return this.apiService.get<HouseUnit>(`/house-units/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching house unit:', error);
        return of(null);
      })
    );
  }

  /**
   * Get units by house block ID
   * @param blockId - House block ID
   */
  getByBlockId(blockId: string): Observable<HouseUnit[]> {
    return this.apiService.get<HouseUnit[]>(`/house-units/block/${blockId}`).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching house units by block:', error);
        return of([]);
      })
    );
  }

  /**
   * Get units by occupancy status
   * @param status - Occupancy status
   */
  getByStatus(status: string): Observable<HouseUnit[]> {
    return this.apiService.get<HouseUnit[]>(`/house-units/by-status/${status}`).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching house units by status:', error);
        return of([]);
      })
    );
  }

  /**
   * Get bank buyback units
   */
  getBankBuybackUnits(): Observable<HouseUnit[]> {
    return this.apiService.get<HouseUnit[]>('/house-units/bank-buyback').pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching bank buyback units:', error);
        return of([]);
      })
    );
  }

  /**
   * Create new house unit
   * @param dto - Create house unit DTO
   */
  create(dto: CreateHouseUnitDto): Observable<HouseUnit | null> {
    return this.apiService.post<HouseUnit>('/house-units', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating house unit:', error);
        throw error;
      })
    );
  }

  /**
   * Update house unit
   * @param id - House unit ID
   * @param dto - Update house unit DTO
   */
  update(id: string, dto: UpdateHouseUnitDto): Observable<HouseUnit | null> {
    return this.apiService.patch<HouseUnit>(`/house-units/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating house unit:', error);
        throw error;
      })
    );
  }

  /**
   * Delete house unit (soft delete)
   * @param id - House unit ID
   */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`/house-units/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting house unit:', error);
        throw error;
      })
    );
  }

  /**
   * Restore deleted house unit
   * @param id - House unit ID
   */
  restore(id: string): Observable<HouseUnit | null> {
    return this.apiService.patch<HouseUnit>(`/house-units/${id}/restore`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error restoring house unit:', error);
        throw error;
      })
    );
  }

  /**
   * Get occupancy statistics
   */
  getOccupancyStats(): Observable<HouseUnitOccupancyStats> {
    return this.apiService.get<HouseUnitOccupancyStats>('/house-units/stats/occupancy').pipe(
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
  private buildQueryParams(params?: HouseUnitQueryParams): string {
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
  private getDefaultStats(): HouseUnitOccupancyStats {
    return {
      totalUnits: 0,
      fullyOccupied: 0,
      occasionally: 0,
      vacant: 0,
      rented: 0,
      bankBuyback: 0
    };
  }
}
