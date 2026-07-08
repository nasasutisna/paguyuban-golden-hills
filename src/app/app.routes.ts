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
    data: { roles: ['ADMIN', 'SUPERADMIN'], breadcrumb: { skip: true }  },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard.page').then(
            (m) => m.AdminDashboardPage
          )
      },
      {
        path: 'house-blocks',
        loadComponent: () =>
          import('./features/admin/house-blocks/house-blocks.page').then(
            (m) => m.HouseBlocksPage
          )
      },
      {
        path: 'house-blocks/new',
        loadComponent: () =>
          import('./features/admin/house-blocks/house-block-form/house-block-form.page').then(
            (m) => m.HouseBlockFormPage
          )
      },
      {
        path: 'house-blocks/:id',
        loadComponent: () =>
          import('./features/admin/house-blocks/house-block-detail/house-block-detail.page').then(
            (m) => m.HouseBlockDetailPage
          )
      },
      {
        path: 'house-blocks/:id/edit',
        loadComponent: () =>
          import('./features/admin/house-blocks/house-block-form/house-block-form.page').then(
            (m) => m.HouseBlockFormPage
          )
      },
      {
        path: 'house-units',
        loadComponent: () =>
          import('./features/admin/house-units/house-units.page').then(
            (m) => m.HouseUnitsPage
          )
      },
      {
        path: 'house-units/new',
        loadComponent: () =>
          import('./features/admin/house-units/house-unit-form/house-unit-form.page').then(
            (m) => m.HouseUnitFormPage
          )
      },
      {
        path: 'house-units/:id',
        loadComponent: () =>
          import('./features/admin/house-units/house-unit-detail/house-unit-detail.page').then(
            (m) => m.HouseUnitDetailPage
          )
      },
      {
        path: 'house-units/:id/edit',
        loadComponent: () =>
          import('./features/admin/house-units/house-unit-form/house-unit-form.page').then(
            (m) => m.HouseUnitFormPage
          )
      },
      {
        path: 'residents',
        loadComponent: () =>
          import('./features/admin/residents/residents.page').then(
            (m) => m.ResidentsPage
          )
      },
      {
        path: 'residents/new',
        loadComponent: () =>
          import('./features/admin/residents/resident-form/resident-form.page').then(
            (m) => m.ResidentFormPage
          )
      },
      {
        path: 'residents/:id',
        loadComponent: () =>
          import('./features/admin/residents/resident-detail/resident-detail.page').then(
            (m) => m.ResidentDetailPage
          )
      },
      {
        path: 'residents/:id/edit',
        loadComponent: () =>
          import('./features/admin/residents/resident-form/resident-form.page').then(
            (m) => m.ResidentFormPage
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
