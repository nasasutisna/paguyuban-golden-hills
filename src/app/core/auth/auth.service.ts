import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, of, EMPTY, interval, Subscription } from 'rxjs';
import { catchError, map, switchMap, tap, take, concatMap, finalize, share } from 'rxjs/operators';
import { ApiService, ApiResponse } from '@core/api/api.service';
import { StorageService } from '@core/storage/storage.service';
import { STORAGE_KEYS } from '@core/constants/storage-keys';
import {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  User,
  AuthState,
  LoginResponseData
} from '@models/auth.model';
import { environment } from 'src/environments/environment';

/**
 * Authentication service
 * Handles login, logout, token refresh, and user session management
 * Storage is the source of truth for authentication state
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private apiService = inject(ApiService);
  private storageService = inject(StorageService);

  private authState$ = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null
  });

  private refreshSubscription: Subscription | null = null;
  // Refresh proactively before the access token expires. Keep this comfortably
  // below the backend JWT_EXPIRES_IN (currently 1h) so it always refreshes in
  // time, but isn't needlessly frequent.
  private readonly TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes

  // Single-flight lock: while a refresh is in flight, concurrent callers share
  // the same observable instead of each hitting the (token-rotating) endpoint.
  private refreshInProgress$: Observable<{ accessToken: string; refreshToken: string }> | null = null;

  constructor() {
    this.apiService.setBaseUrl(environment.apiUrl);
    this.initializeAuth();
  }

  /**
   * Initialize authentication from stored data
   * Called by APP_INITIALIZER to ensure auth state is loaded before routing
   */
  async initializeAuth(): Promise<void> {
    try {
      // Read from storage
      const [accessToken, refreshToken, user] = await Promise.all([
        this.storageService.get<string>(STORAGE_KEYS.ACCESS_TOKEN),
        this.storageService.get<string>(STORAGE_KEYS.REFRESH_TOKEN),
        this.storageService.get<User>(STORAGE_KEYS.USER_DATA)
      ]);

      if (accessToken && refreshToken && user) {
        this.authState$.next({
          isAuthenticated: true,
          user,
          accessToken,
          refreshToken
        });
        this.startTokenRefresh();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  /**
   * Get current authentication state as observable
   */
  get authState(): Observable<AuthState> {
    return this.authState$.asObservable();
  }

  /**
   * Get current authentication state value from storage (source of truth)
   */
  get currentAuthState(): AuthState {
    return this.authState$.value;
  }

  /**
   * Check if user is authenticated by checking storage for access token
   */
  get isAuthenticated(): boolean {
    // Read directly from storage as source of truth
    return !!this.authState$.value.accessToken;
  }

  /**
   * Get current user by reading from storage
   */
  get currentUser(): User | null {
    // Read directly from storage as source of truth
    return this.authState$.value.user;
  }

  /**
   * Get access token from storage (source of truth)
   */
  get accessToken(): string | null {
    return this.authState$.value.accessToken;
  }

  /**
   * Get refresh token from storage
   */
  get refreshToken(): string | null {
    return this.authState$.value.refreshToken;
  }

  /**
   * Get display name from user data
   */
  get userDisplayName(): string {
    const user = this.currentUser;
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username;
  }

  /**
   * Refresh auth state from storage
   * Call this to ensure the in-memory state matches storage
   */
  async refreshAuthState(): Promise<void> {
    try {
      const [accessToken, refreshToken, user] = await Promise.all([
        this.storageService.get<string>(STORAGE_KEYS.ACCESS_TOKEN),
        this.storageService.get<string>(STORAGE_KEYS.REFRESH_TOKEN),
        this.storageService.get<User>(STORAGE_KEYS.USER_DATA)
      ]);

      this.authState$.next({
        isAuthenticated: !!accessToken,
        user,
        accessToken,
        refreshToken
      });

      if (accessToken && refreshToken) {
        this.startTokenRefresh();
      } else {
        this.stopTokenRefresh();
      }
    } catch (error) {
      console.error('Error refreshing auth state:', error);
    }
  }

  /**
   * Login with username and password
   * @param request - Login request
   * @param rememberMe - Remember login credentials
   */
  login(request: LoginRequest, rememberMe = false): Observable<LoginResponseData> {
    return this.apiService.post<LoginResponseData>('/auth/login', request).pipe(
      concatMap(async (response: ApiResponse<LoginResponseData>) => {
        const data = response.data;
        // Wait for auth data to be saved before proceeding
        await this.saveAuthData(data.user, data, rememberMe, request.username);
        return response.data;
      }),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  /**
   * Register new user
   * @param request - Register request
   */
  register(request: RegisterRequest): Observable<LoginResponseData> {
    return this.apiService.post<LoginResponseData>('/auth/register', request).pipe(
      concatMap(async (response: ApiResponse<LoginResponseData>) => {
        const data = response.data;
        // Wait for auth data to be saved before proceeding
        await this.saveAuthData(data.user, data, false, request.username);
        return response.data;
      }),
      catchError(error => {
        console.error('Register error:', error);
        throw error;
      })
    );
  }

  /**
   * Refresh access token using refresh token
   */
  /**
   * Refresh access token using refresh token.
   * Single-flighted: concurrent callers (proactive timer + multiple 401 retries)
   * share the same in-flight refresh. The backend rotates the refresh token on
   * every refresh, so issuing more than one at once would invalidate the others
   * and log the user out.
   */
  refreshAccessToken(): Observable<{ accessToken: string; refreshToken: string }> {
    // A refresh is already in progress — reuse it
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    const currentRefreshToken = this.authState$.value.refreshToken;

    if (!currentRefreshToken) {
      return of({} as any);
    }

    const request: RefreshTokenRequest = { refreshToken: currentRefreshToken };

    this.refreshInProgress$ = this.apiService.post<any>('/auth/refresh', request).pipe(
      tap(async (response: any) => {
        const data = response.data;
        await this.updateTokens(data.accessToken, data.refreshToken || currentRefreshToken);
      }),
      map((response: any) => ({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken || currentRefreshToken
      })),
      catchError(error => {
        console.error('Token refresh error:', error);
        // Clear local session directly (no API call) to avoid a refresh/logout
        // loop — the refresh token is already invalid, so a server logout would
        // just 401 again.
        this.clearAuthData();
        return EMPTY;
      }),
      finalize(() => {
        this.refreshInProgress$ = null;
      }),
      share()
    );

    return this.refreshInProgress$;
  }

  /**
   * Logout current user
   */
  logout(): Observable<void> {
    return this.apiService.post('/auth/logout', {}).pipe(
      tap(async () => {
        await this.clearAuthData();
      }),
      catchError(error => {
        console.error('Logout error:', error);
        // Clear auth data even if API call fails
        this.clearAuthData();
        return of(void 0);
      }),
      switchMap(() => of(void 0))
    );
  }

  /**
   * Get current user profile
   */
  getCurrentUser(): Observable<User> {
    return this.apiService.get<any>('/auth/me').pipe(
      map(response => response.data.user || response.data),
      tap(async (user) => {
        await this.storageService.set(STORAGE_KEYS.USER_DATA, user);
        // Update auth state with new user data
        const currentState = this.authState$.value;
        this.authState$.next({
          ...currentState,
          user
        });
      }),
      catchError(error => {
        console.error('Get current user error:', error);
        throw error;
      })
    );
  }

  /**
   * Update user profile
   * @param updates - User profile updates
   */
  updateProfile(updates: Partial<User>): Observable<User> {
    return this.apiService.put<User>('/auth/me', updates).pipe(
      map(response => response.data),
      tap(async (user) => {
        await this.storageService.set(STORAGE_KEYS.USER_DATA, user);
        // Update auth state with new user data
        const currentState = this.authState$.value;
        this.authState$.next({
          ...currentState,
          user
        });
      })
    );
  }

  /**
   * Check if user has required role
   * @param roles - Required roles
   */
  hasRole(roles: string[]): boolean {
    const user = this.currentUser;
    if (!user) return false;
    return roles.includes(user.roleId);
  }

  /**
   * Get remembered username
   */
  async getRememberedUsername(): Promise<string | null> {
    return this.storageService.get(STORAGE_KEYS.REMEMBERED_USERNAME);
  }

  /**
   * Clear all auth data (for logout)
   */
  async clearAuthData(): Promise<void> {
    // Clear from Capacitor Preferences
    await Promise.all([
      this.storageService.remove(STORAGE_KEYS.ACCESS_TOKEN),
      this.storageService.remove(STORAGE_KEYS.REFRESH_TOKEN),
      this.storageService.remove(STORAGE_KEYS.USER_DATA)
    ]);

    // Also clear from localStorage
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(STORAGE_KEYS.REMEMBERED_USERNAME);

    this.stopTokenRefresh();

    this.authState$.next({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null
    });
  }

  /**
   * Save authentication data to storage
   */
  private async saveAuthData(
    user: User,
    tokenData: { accessToken: string; refreshToken: string; expiresIn?: number },
    rememberMe: boolean,
    username?: string
  ): Promise<void> {
    // Save to Capacitor Preferences
    await Promise.all([
      this.storageService.set(STORAGE_KEYS.ACCESS_TOKEN, tokenData.accessToken),
      this.storageService.set(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refreshToken),
      this.storageService.set(STORAGE_KEYS.USER_DATA, user),
      this.storageService.set(STORAGE_KEYS.REMEMBER_ME, rememberMe)
    ]);

    // Also save to localStorage as backup (for synchronous access)
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refreshToken);

    if (rememberMe && username) {
      await this.storageService.set(STORAGE_KEYS.REMEMBERED_USERNAME, username);
      localStorage.setItem(STORAGE_KEYS.REMEMBERED_USERNAME, username);
    } else if (!rememberMe) {
      await this.storageService.remove(STORAGE_KEYS.REMEMBERED_USERNAME);
      localStorage.removeItem(STORAGE_KEYS.REMEMBERED_USERNAME);
    }

    // Update auth state
    this.authState$.next({
      isAuthenticated: true,
      user,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken
    });

    this.startTokenRefresh();
  }

  /**
   * Update tokens in storage
   */
  private async updateTokens(accessToken: string, refreshToken: string): Promise<void> {
    // Save to Capacitor Preferences
    await Promise.all([
      this.storageService.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      this.storageService.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    ]);

    // Also save to localStorage as backup
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    // Update auth state
    this.authState$.next({
      ...this.authState$.value,
      accessToken,
      refreshToken
    });
  }

  /**
   * Start automatic token refresh
   */
  private startTokenRefresh(): void {
    this.stopTokenRefresh();

    this.refreshSubscription = interval(this.TOKEN_REFRESH_INTERVAL).subscribe(() => {
      if (this.isAuthenticated) {
        this.refreshAccessToken().pipe(take(1)).subscribe();
      }
    });
  }

  /**
   * Stop automatic token refresh
   */
  private stopTokenRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    this.stopTokenRefresh();
  }
}
