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
 * Guest Guard
 * Protects routes that should only be accessible to unauthenticated users
 * Redirects authenticated users to dashboard
 */
export const guestGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // First refresh auth state from storage to ensure we have the latest data
  // Then check if user should access guest routes
  return from(authService.refreshAuthState()).pipe(
    switchMap(() => {
      return authService.authState.pipe(
        take(1),
        map((state) => {
          if (!state.isAuthenticated) {
            return true;
          }

          // Redirect all authenticated users to dashboard
          return router.createUrlTree(['/dashboard']);
        })
      );
    })
  );
};
