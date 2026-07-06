import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';

/**
 * JWT Interceptor
 * Automatically injects access token into requests and handles token refresh
 */
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);

  /**
   * Check if request needs authentication
   */
  private needsAuth(url: string): boolean {
    // Skip auth for public endpoints
    const publicEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
    return !publicEndpoints.some(endpoint => url.includes(endpoint));
  }

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Get access token from auth service
    const accessToken = this.authService.accessToken;

    // Clone request and add authorization header if token exists
    if (accessToken && this.needsAuth(request.url)) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized - try to refresh token
        if (error.status === 401 && this.authService.isAuthenticated) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle 401 errors by attempting to refresh the token
   */
  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Try to refresh the token
    return this.authService.refreshAccessToken().pipe(
      take(1),
      switchMap(() => {
        // Retry the original request with new token
        const newAccessToken = this.authService.accessToken;
        const clonedRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${newAccessToken}`
          }
        });
        return next.handle(clonedRequest);
      }),
      catchError((error) => {
        // If refresh fails, logout and redirect to login
        this.authService.logout().subscribe();
        return EMPTY;
      })
    );
  }
}
