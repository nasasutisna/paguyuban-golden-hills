import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@services/toast.service';
import { getRequiredRoles } from '@core/guards/role-access.config';

/**
 * Role Guard (URL-prefix based)
 *
 * Role requirements live in a single source of truth — `ROUTE_ROLE_RULES` in
 * role-access.config.ts — shared with the side menu so the menu only shows
 * pages the user can actually open. The guard resolves the required roles from
 * the navigated URL (longest-prefix match); URLs with no matching rule are
 * auth-only. `SUPERADMIN` bypasses every check.
 */
export const roleGuard: CanActivateFn = (
  _route,
  state: RouterStateSnapshot,
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  const requiredRoles = getRequiredRoles(state.url);

  // No rule for this URL → auth-only (authGuard has already run).
  if (!requiredRoles || requiredRoles.length === 0) {
    return of(true);
  }

  return authService.authState.pipe(
    map((auth) => {
      if (!auth.isAuthenticated || !auth.user) {
        return router.createUrlTree(['/auth/login'], {
          queryParams: { returnUrl: state.url },
        });
      }

      const role = auth.user.role?.name || '';
      if (role === 'SUPERADMIN' || requiredRoles.includes(role)) {
        return true;
      }

      toastService.error('Anda tidak memiliki akses ke halaman ini');
      return router.createUrlTree(['/profile']);
    }),
  );
};
