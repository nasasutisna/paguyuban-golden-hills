import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree,
  ActivatedRouteSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';

/**
 * Guest Guard
 * Protects routes that should only be accessible to unauthenticated users
 * Redirects authenticated users to dashboard
 * Can be bypassed with ?bypass=true query param (for logout flow)
 */
export const guestGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if bypass is requested (for logout flow)
  const bypass = route.queryParamMap.get('bypass') === 'true';

  if (bypass) {
    return of(true);
  }

  // Check current auth state without forcing refresh from storage
  // The authState is already updated by login/register operations
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
};
