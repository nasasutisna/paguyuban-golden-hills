import { Routes } from '@angular/router';

// Guards
import { authGuard } from '@guards/auth.guard';
import { guestGuard } from '@guards/guest.guard';
import { roleGuard } from '@guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  // Authentication Routes (Guest only - redirect to dashboard if authenticated)
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.page').then((m) => m.LoginPage)
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.page').then((m) => m.RegisterPage)
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.page').then(
            (m) => m.ForgotPasswordPage
          )
      }
    ]
  },
  // Dashboard Route (Protected - requires auth)
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin-dashboard/admin-dashboard.page').then(
        (m) => m.AdminDashboardPage
      )
  },
  // Protected Routes (Require authentication)
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.page').then((m) => m.ProfilePage)
  },
  // Admin Routes (Require admin role)
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'moderator'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard.page').then(
            (m) => m.AdminDashboardPage
          )
      }
    ]
  },
  // Legacy folder route (can be removed if not needed)
  {
    path: 'folder/:id',
    loadComponent: () =>
      import('./folder/folder.page').then((m) => m.FolderPage)
  },
  // Wildcard route - redirect to login
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];
