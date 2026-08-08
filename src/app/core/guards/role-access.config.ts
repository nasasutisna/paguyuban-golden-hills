/**
 * Centralized RBAC map — the SINGLE source of truth for both the route guard
 * (role.guard.ts) and the side menu (app.component). Each rule maps a URL
 * prefix to the roles allowed to access it. The roles mirror the backend
 * `@Roles(...)` decorator on each module's list/read endpoint, so the menu
 * only offers pages the user can actually open.
 *
 * Matching: longest-prefix-wins. A request for `/admin/residents/123/edit`
 * matches `/admin/residents` before the `/admin` default. Prefix boundary is
 * enforced with a trailing `/` so `/admin/ipl-payments` does NOT match
 * `/admin/ipl-payment-matrix`.
 *
 * `SUPERADMIN` is intentionally absent from every list — it is handled as a
 * global bypass in both the guard and the menu.
 */
export interface RouteRoleRule {
  path: string;
  roles: string[];
}

export const ROUTE_ROLE_RULES: RouteRoleRule[] = [
  // === Master Data ===
  { path: '/admin/residents', roles: ['ADMIN', 'MANAGER'] },
  { path: '/admin/house-units', roles: ['ADMIN', 'MANAGER'] },
  { path: '/admin/house-blocks', roles: ['ADMIN', 'MANAGER'] },
  { path: '/admin/employees', roles: ['ADMIN', 'MANAGER'] },
  { path: '/admin/employee-salary-headers', roles: ['ADMIN', 'ACCOUNTANT', 'MANAGER'] },
  { path: '/admin/users', roles: ['ADMIN', 'MANAGER'] },

  // === Keuangan ===
  { path: '/admin/cash-transactions', roles: ['ADMIN', 'ACCOUNTANT'] },
  { path: '/admin/fee-types', roles: ['ADMIN', 'ACCOUNTANT'] },
  { path: '/admin/resident-invoices', roles: ['ADMIN', 'ACCOUNTANT'] },

  // === IPL & Iuran ===
  // IPL payment list is also readable by COORDINATOR; write actions stay
  // ADMIN/ACCOUNTANT and are enforced by the backend.
  { path: '/admin/ipl-payments', roles: ['ADMIN', 'ACCOUNTANT', 'COORDINATOR'] },
  { path: '/admin/resident-payments', roles: ['ADMIN', 'ACCOUNTANT'] },
  { path: '/admin/ipl-periods', roles: ['ADMIN', 'ACCOUNTANT'] },
  { path: '/admin/whatsapp-blast', roles: ['ADMIN', 'ACCOUNTANT'] },
  { path: '/admin/setting-whatsapp', roles: ['ADMIN', 'ACCOUNTANT'] },
  { path: '/admin/whatsapp-bot-tester', roles: ['ADMIN', 'ACCOUNTANT'] },
  { path: '/admin/ipl-payment-matrix', roles: ['PENGURUS', 'COORDINATOR', 'ADMIN', 'ACCOUNTANT', 'MANAGER', 'STAFF'] },
  { path: '/admin/resident-payment-matrix', roles: ['ADMIN', 'ACCOUNTANT'] },

  // === Pengaturan (admin-only) ===
  { path: '/admin/settings', roles: ['ADMIN'] },

  // === Pengajuan ===
  // Menu-visibility only. The route itself stays authGuard-only (the backend
  // enforces per-action roles: PENGURUS/COORDINATOR submit, ADMIN/ACCOUNTANT
  // approve); this rule just keeps the dead link off the menu for unrelated
  // roles.
  {
    path: '/expense-requests',
    roles: ['PENGURUS', 'COORDINATOR', 'ADMIN', 'ACCOUNTANT', 'MANAGER', 'STAFF'],
  },

  // === Default for the rest of /admin/* ===
  // Anything not listed above (e.g. /admin/settings/*, future routes) still
  // requires an admin-area role, keeping STAFF/PENGURUS out of /admin.
  { path: '/admin', roles: ['ADMIN', 'SUPERADMIN', 'MANAGER', 'ACCOUNTANT', 'COORDINATOR'] },
];

/**
 * Returns the roles required for a URL (longest-prefix match), or `undefined`
 * when no rule matches (meaning auth-only — no role restriction).
 */
export function getRequiredRoles(url: string): string[] | undefined {
  // Strip query params / fragments before matching.
  const path = url.split(/[?#]/)[0];

  let best: RouteRoleRule | undefined;
  for (const rule of ROUTE_ROLE_RULES) {
    const matches = path === rule.path || path.startsWith(rule.path + '/');
    if (matches && (!best || rule.path.length > best.path.length)) {
      best = rule;
    }
  }
  return best?.roles;
}
