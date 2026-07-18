import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import {
  Employee,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeListResponse,
  EmployeeStatistics,
  EmployeeQueryParams,
  EmploymentStatus
} from './employees.model';

/**
 * Employees Service
 * Handles all API calls for employees CRUD operations
 */
@Injectable({
  providedIn: 'root'
})
export class EmployeesService {
  private apiService = inject(ApiService);

  /**
   * Get paginated list of employees
   * @param params - Query parameters for filtering, sorting, pagination
   */
  getAll(params?: EmployeeQueryParams): Observable<EmployeeListResponse> {
    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<any>(`/employees${queryParams}`).pipe(
      map((response) => {
        // API response structure: { data: [...], meta: { total, page, limit, totalPages } }
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
        console.error('Error fetching employees:', error);
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
   * Get employee by ID
   * @param id - Employee ID
   */
  getById(id: string): Observable<Employee | null> {
    return this.apiService.get<Employee>(`/employees/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching employee:', error);
        return of(null);
      })
    );
  }

  /**
   * Get employees by employment status
   * @param status - Employment status (ACTIVE, PROBATION, RESIGNED, TERMINATED)
   */
  getByEmploymentStatus(status: EmploymentStatus | string): Observable<Employee[]> {
    return this.apiService.get<Employee[]>(`/employees/status/${status}`).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error fetching employees by status:', error);
        return of([]);
      })
    );
  }

  /**
   * Create new employee
   * @param dto - Create employee DTO
   */
  create(dto: CreateEmployeeDto): Observable<Employee | null> {
    return this.apiService.post<Employee>('/employees', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error creating employee:', error);
        throw error;
      })
    );
  }

  /**
   * Update employee
   * @param id - Employee ID
   * @param dto - Update employee DTO
   */
  update(id: string, dto: UpdateEmployeeDto): Observable<Employee | null> {
    return this.apiService.patch<Employee>(`/employees/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating employee:', error);
        throw error;
      })
    );
  }

  /**
   * Delete employee (soft delete)
   * @param id - Employee ID
   */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`/employees/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting employee:', error);
        throw error;
      })
    );
  }

  /**
   * Restore soft deleted employee
   * @param id - Employee ID
   */
  restore(id: string): Observable<Employee | null> {
    return this.apiService.patch<Employee>(`/employees/${id}/restore`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error restoring employee:', error);
        throw error;
      })
    );
  }

  /**
   * Activate employee
   * @param id - Employee ID
   */
  activate(id: string): Observable<Employee | null> {
    return this.apiService.patch<Employee>(`/employees/${id}/activate`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error activating employee:', error);
        throw error;
      })
    );
  }

  /**
   * Deactivate employee
   * @param id - Employee ID
   */
  deactivate(id: string): Observable<Employee | null> {
    return this.apiService.patch<Employee>(`/employees/${id}/deactivate`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error deactivating employee:', error);
        throw error;
      })
    );
  }

  /**
   * Get employee statistics
   */
  getStatistics(): Observable<EmployeeStatistics> {
    return this.apiService.get<EmployeeStatistics>('/employees/statistics').pipe(
      map((response) => response.data || this.getDefaultStatistics()),
      catchError((error) => {
        console.error('Error fetching employee statistics:', error);
        return of(this.getDefaultStatistics());
      })
    );
  }

  /**
   * Build query parameters string from object
   */
  private buildQueryParams(params?: EmployeeQueryParams): string {
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
  private getDefaultStatistics(): EmployeeStatistics {
    return {
      totalEmployees: 0,
      activeEmployees: 0,
      probationEmployees: 0,
      resignedEmployees: 0,
      terminatedEmployees: 0,
      byDepartment: {}
    };
  }
}
