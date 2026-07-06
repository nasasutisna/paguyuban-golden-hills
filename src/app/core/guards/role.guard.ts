import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree,
  ActivatedRouteSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@services/toast.service';

/**
 * Role Guard Configuration
 * Define route roles in route data:
 * {
 *   path: 'admin',
 *   canActivate: [roleGuard],
 *   data: { roles: ['admin', 'moderator'] }
 * }
 */

/**
 * Role Guard
 * Protects routes based on user roles
 * Redirects users without required roles to access denied page
 */
export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  // Get required roles from route data
  const requiredRoles = route.data?.['roles'] as string[] | undefined;

  if (!requiredRoles || requiredRoles.length === 0) {
    return of(true);
  }

  return authService.authState.pipe(
    map((state) => {
      if (!state.isAuthenticated) {
        // Not authenticated - redirect to login
        return router.createUrlTree(['/auth/login'], {
          queryParams: { returnUrl: router.url }
        });
      }

      if (!state.user) {
        return router.createUrlTree(['/auth/login']);
      }

      // Check if user has any of the required roles
      const hasRole = requiredRoles.includes(state.user.roleId);

      if (hasRole) {
        return true;
      }

      // User doesn't have required role - show toast and redirect
      toastService.error('You do not have permission to access this page');
      return router.createUrlTree(['/profile']);
    })
  );
};
