import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree
} from '@angular/router';
import { Observable, from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';

/**
 * Auth Guard
 * Protects routes that require authentication
 * Redirects unauthenticated users to login page
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // First refresh auth state from storage to ensure we have the latest data
  // Then check if user is authenticated
  return from(authService.refreshAuthState()).pipe(
    switchMap(() => {
      return authService.authState.pipe(
        take(1),
        map((state) => {
          console.log('Auth Guard - Auth State:', state);
          if (state.isAuthenticated) {
            return true;
          }

          // Redirect to login with return URL
          return router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: router.url }
          });
        })
      );
    })
  );
};
