import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, EMPTY, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, take, filter, first, tap } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';
import { StorageService } from '@core/storage/storage.service';
import { STORAGE_KEYS } from '@core/constants/storage-keys';

/**
 * JWT Interceptor
 * Automatically injects access token into requests and handles token refresh
 */
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private storageService = inject(StorageService);

  // Cache token to avoid repeated storage reads
  private cachedToken: string | null = null;
  private tokenReady$ = new BehaviorSubject<boolean>(false);

  constructor() {
    console.log('[JWT] Interceptor instantiated');
    // Initialize token from storage on start
    this.initToken().catch((err) => {
      console.error('[JWT] Init error:', err);
      this.tokenReady$.next(true); // Allow requests to proceed even if init fails
    });

    // Listen to auth state changes to update cache
    this.authService.authState.subscribe({
      next: (state) => {
        if (state.accessToken !== this.cachedToken) {
          this.cachedToken = state.accessToken;
          console.log('[JWT] Token updated from auth state:', state.accessToken ? 'Yes' : 'No');
        }
      },
      error: (err) => console.error('[JWT] Auth state error:', err)
    });
  }

  /**
   * Initialize token from storage (try both Capacitor and localStorage)
   */
  private async initToken(): Promise<void> {
    console.log('[JWT] Starting token initialization...');

    try {
      // Try Capacitor Preferences first
      let token = await this.storageService.get<string>(STORAGE_KEYS.ACCESS_TOKEN);

      // Fallback to localStorage
      if (!token) {
        const lsToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (lsToken) {
          token = lsToken;
          console.log('[JWT] Token found in localStorage');
        }
      }

      this.cachedToken = token;
      this.tokenReady$.next(true);
      console.log('[JWT] Token initialized:', token ? 'Found' : 'Not found');
    } catch (error) {
      console.error('[JWT] Error in initToken:', error);
      // Try localStorage as final fallback
      const lsToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      this.cachedToken = lsToken;
      this.tokenReady$.next(true);
      console.log('[JWT] Using localStorage fallback:', lsToken ? 'Found' : 'Not found');
    }
  }

  /**
   * Check if request needs authentication
   */
  private needsAuth(url: string): boolean {
    // Skip auth for public endpoints
    const publicEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
    return !publicEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Get access token synchronously (from cache, auth service, or localStorage)
   */
  private getToken(): string | null {
    // Priority: Cache > AuthService > localStorage
    if (this.cachedToken) {
      return this.cachedToken;
    }

    const authServiceToken = this.authService.accessToken;
    if (authServiceToken) {
      return authServiceToken;
    }

    // Final fallback to localStorage
    const lsToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (lsToken) {
      this.cachedToken = lsToken;
      return lsToken;
    }

    return null;
  }

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    console.log('[JWT] Intercepting request:', request.url);

    // Check if request needs authentication
    if (this.needsAuth(request.url)) {
      console.log('[JWT] Request needs authentication');

      // Wait for token to be ready, then proceed
      return this.tokenReady$.pipe(
        filter((ready) => ready),
        first(),
        tap(() => console.log('[JWT] Token is ready')),
        switchMap(() => {
          const accessToken = this.getToken();

          console.log('[JWT] Request:', request.url);
          console.log('[JWT] Token present:', accessToken ? 'YES' : 'NO');
          console.log('[JWT] Token length:', accessToken?.length || 0);

          if (accessToken) {
            request = request.clone({
              setHeaders: {
                Authorization: `Bearer ${accessToken}`
              }
            });
            console.log('[JWT] Authorization header added');
          } else {
            console.warn('[JWT] No token available for:', request.url);
          }

          return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
              console.error('[JWT] Request error:', error.status, error.url);
              // Handle 401 Unauthorized - try to refresh token
              if (error.status === 401 && this.authService.isAuthenticated) {
                console.log('[JWT] Got 401, attempting token refresh');
                return this.handle401Error(request, next);
              }
              return throwError(() => error);
            })
          );
        })
      );
    }

    console.log('[JWT] Request does not need authentication');
    return next.handle(request);
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
        console.log('Retrying request with new access token:', newAccessToken);
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
