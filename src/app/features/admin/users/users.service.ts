import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import {
  User,
  Role,
  CreateUserDto,
  UpdateUserDto,
  ResetPasswordDto,
  PasswordDeliveryResult,
  UserListResponse,
  RoleListResponse,
  UserQueryParams,
} from './users.model';

/**
 * Users Service
 * Handles all API calls for user management CRUD + password reset.
 */
@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private apiService = inject(ApiService);

  /** Paginated list of users */
  getAll(params?: UserQueryParams): Observable<UserListResponse> {
    const queryParams = this.buildQueryParams(params);
    return this.apiService.get<any>(`/users${queryParams}`).pipe(
      map((response) => {
        const paginatedData = response.data || {};
        const data = Array.isArray(paginatedData)
          ? paginatedData
          : paginatedData.data || [];
        const metadata = response?.meta;
        return {
          data,
          total: metadata?.total ?? data.length,
          page: metadata?.page ?? 1,
          limit: metadata?.limit ?? 10,
          totalPages: metadata?.totalPages ?? 1,
        };
      }),
      catchError((error) => {
        console.error('Error fetching users:', error);
        return of({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      }),
    );
  }

  /** Get user by ID (includes role + linked resident) */
  getById(id: string): Observable<User | null> {
    return this.apiService.get<User>(`/users/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching user:', error);
        return of(null);
      }),
    );
  }

  /** Create a new user (optionally generate password + send via WhatsApp) */
  create(dto: CreateUserDto): Observable<User & PasswordDeliveryResult> {
    return this.apiService
      .post<User & PasswordDeliveryResult>('/users', dto)
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error('Error creating user:', error);
          throw error;
        }),
      );
  }

  /** Update user (role, name, phone, resident link, active status) */
  update(id: string, dto: UpdateUserDto): Observable<User | null> {
    return this.apiService.patch<User>(`/users/${id}`, dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error updating user:', error);
        throw error;
      }),
    );
  }

  /** Soft delete a user */
  delete(id: string): Observable<boolean> {
    return this.apiService.delete<void>(`/users/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error deleting user:', error);
        throw error;
      }),
    );
  }

  /** Activate a user */
  activate(id: string): Observable<User | null> {
    return this.apiService.patch<User>(`/users/${id}/activate`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error activating user:', error);
        throw error;
      }),
    );
  }

  /** Deactivate a user */
  deactivate(id: string): Observable<User | null> {
    return this.apiService.patch<User>(`/users/${id}/deactivate`, {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error deactivating user:', error);
        throw error;
      }),
    );
  }

  /** Set / reset a user's password (manual or generated, optional WA delivery) */
  resetPassword(
    id: string,
    dto: ResetPasswordDto,
  ): Observable<PasswordDeliveryResult> {
    return this.apiService
      .patch<PasswordDeliveryResult>(`/users/${id}/password`, dto)
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error('Error resetting password:', error);
          throw error;
        }),
      );
  }

  /** Fetch available roles for the role dropdown */
  getRoles(): Observable<Role[]> {
    return this.apiService.get<RoleListResponse>('/roles?limit=100').pipe(
      map((response) => {
        const paginatedData = response.data || {};
        const data = Array.isArray(paginatedData)
          ? paginatedData
          : paginatedData.data || [];
        return data;
      }),
      catchError((error) => {
        console.error('Error fetching roles:', error);
        return of([]);
      }),
    );
  }

  private buildQueryParams(params?: UserQueryParams): string {
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
