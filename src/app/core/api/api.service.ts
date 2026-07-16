import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * API response interface (matches backend Swagger spec)
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  errors?: string[][];
  timestamp: string;
  meta?: Paging;
  path: string;
}

export interface Paging {
  page: number;
  limit: number;
  totalPages: number;
  total:number
}

/**
 * API request options interface
 */
export interface ApiRequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: HttpParams | Record<string, string | string[]>;
  withCredentials?: boolean;
  timeout?: number;
}

/**
 * Base API service for making HTTP requests
 * Provides common methods for GET, POST, PUT, PATCH, DELETE operations
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;
  private defaultTimeout = 30000; // 30 seconds

  constructor(private http: HttpClient) {}

  /**
   * Set the base URL for API requests
   * @param url - Base URL for the API
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Perform a GET request
   * @param endpoint - API endpoint path
   * @param options - Request options
   */
  get<T>(endpoint: string, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * Perform a GET request and return the response body as a Blob.
   * Use this for binary/file downloads (e.g. Excel exports). The response is
   * NOT parsed as JSON, and authentication is still applied by the JWT
   * interceptor (which clones the request regardless of responseType).
   * @param endpoint - API endpoint path
   * @param options - Request options
   */
  getBlob(endpoint: string, options?: ApiRequestOptions): Observable<Blob> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeoutValue = options?.timeout ?? this.defaultTimeout;

    return this.http
      .get(url, {
        headers: options?.headers,
        params: options?.params,
        withCredentials: options?.withCredentials,
        responseType: 'blob',
      })
      .pipe(
        timeout(timeoutValue),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Perform a POST request
   * @param endpoint - API endpoint path
   * @param body - Request body data
   * @param options - Request options
   */
  post<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body, options);
  }

  /**
   * Perform a PUT request
   * @param endpoint - API endpoint path
   * @param body - Request body data
   * @param options - Request options
   */
  put<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  /**
   * Perform a PATCH request
   * @param endpoint - API endpoint path
   * @param body - Request body data
   * @param options - Request options
   */
  patch<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  /**
   * Perform a DELETE request
   * @param endpoint - API endpoint path
   * @param options - Request options
   */
  delete<T>(endpoint: string, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * Generic request method
   * @param method - HTTP method
   * @param endpoint - API endpoint path
   * @param body - Request body data
   * @param options - Request options
   */
  private request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions
  ): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeoutValue = options?.timeout ?? this.defaultTimeout;

    let request: Observable<ApiResponse<T>>;

    switch (method) {
      case 'GET':
        request = this.http.get<ApiResponse<T>>(url, {
          headers: options?.headers,
          params: options?.params,
          withCredentials: options?.withCredentials
        });
        break;
      case 'POST':
        request = this.http.post<ApiResponse<T>>(url, body, {
          headers: options?.headers,
          params: options?.params,
          withCredentials: options?.withCredentials
        });
        break;
      case 'PUT':
        request = this.http.put<ApiResponse<T>>(url, body, {
          headers: options?.headers,
          params: options?.params,
          withCredentials: options?.withCredentials
        });
        break;
      case 'PATCH':
        request = this.http.patch<ApiResponse<T>>(url, body, {
          headers: options?.headers,
          params: options?.params,
          withCredentials: options?.withCredentials
        });
        break;
      case 'DELETE':
        request = this.http.delete<ApiResponse<T>>(url, {
          headers: options?.headers,
          params: options?.params,
          withCredentials: options?.withCredentials
        });
        break;
      default:
        return throwError(() => new Error(`Unsupported method: ${method}`));
    }

    return request.pipe(
      timeout(timeoutValue),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * Handle HTTP errors
   * @param error - HTTP error response
   */
  private handleError(error: unknown): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error instanceof TimeoutError) {
      errorMessage = 'Request timeout. Please try again.';
    } else if (error instanceof HttpErrorResponse) {
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        errorMessage = error.error?.message || `Error Code: ${error.status}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error('API Error:', errorMessage, error);
    return throwError(() => error);
  }
}
