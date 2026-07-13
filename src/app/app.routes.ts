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
      },
      // Fee Types Routes
      {
        path: 'fee-types',
        loadComponent: () =>
          import('./features/admin/fee-types/fee-types.page').then(
            (m) => m.FeeTypesPage
          )
      },
      {
        path: 'fee-types/new',
        loadComponent: () =>
          import('./features/admin/fee-type-form/fee-type-form.page').then(
            (m) => m.FeeTypeFormPage
          )
      },
      {
        path: 'fee-types/:id/edit',
        loadComponent: () =>
          import('./features/admin/fee-type-form/fee-type-form.page').then(
            (m) => m.FeeTypeFormPage
          )
      },
      // Resident Invoices Routes
      {
        path: 'resident-invoices',
        loadComponent: () =>
          import('./features/admin/resident-invoices/resident-invoices.page').then(
            (m) => m.ResidentInvoicesPage
          )
      },
      {
        path: 'resident-invoices/new',
        loadComponent: () =>
          import('./features/admin/resident-invoice-form/resident-invoice-form.page').then(
            (m) => m.ResidentInvoiceFormPage
          )
      },
      {
        path: 'resident-invoices/:id',
        loadComponent: () =>
          import('./features/admin/resident-invoice-detail/resident-invoice-detail.page').then(
            (m) => m.ResidentInvoiceDetailPage
          )
      },
      {
        path: 'resident-invoices/:id/edit',
        loadComponent: () =>
          import('./features/admin/resident-invoice-form/resident-invoice-form.page').then(
            (m) => m.ResidentInvoiceFormPage
          )
      },
      // Resident Payments Routes
      {
        path: 'resident-payments',
        loadComponent: () =>
          import('./features/admin/resident-payments/resident-payments.page').then(
            (m) => m.ResidentPaymentsPage
          )
      },
      {
        path: 'resident-payments/new',
        loadComponent: () =>
          import('./features/admin/resident-payment-form/resident-payment-form.page').then(
            (m) => m.ResidentPaymentFormPage
          )
      },
      {
        path: 'resident-payments/:id',
        loadComponent: () =>
          import('./features/admin/resident-payments/resident-payments.page').then(
            (m) => m.ResidentPaymentsPage
          )
      },
      // IPL Periods Routes
      {
        path: 'ipl-periods',
        loadComponent: () =>
          import('./features/admin/ipl-payments/ipl-periods.page').then(
            (m) => m.IplPeriodsPage
          )
      },
      {
        path: 'ipl-periods/new',
        loadComponent: () =>
          import('./features/admin/ipl-payments/ipl-period-form/ipl-period-form.page').then(
            (m) => m.IplPeriodFormPage
          )
      },
      {
        path: 'ipl-periods/:id/edit',
        loadComponent: () =>
          import('./features/admin/ipl-payments/ipl-period-form/ipl-period-form.page').then(
            (m) => m.IplPeriodFormPage
          )
      },
      // IPL Payments Routes
      {
        path: 'ipl-payments',
        loadComponent: () =>
          import('./features/admin/ipl-payments/ipl-payments.page').then(
            (m) => m.IplPaymentsPage
          )
      },
      {
        path: 'ipl-payments/new',
        loadComponent: () =>
          import('./features/admin/ipl-payments/ipl-payment-form/ipl-payment-form.page').then(
            (m) => m.IplPaymentFormPage
          )
      },
      {
        path: 'ipl-payments/bulk/new',
        loadComponent: () =>
          import('./features/admin/ipl-payments/ipl-bulk-payment-form/ipl-bulk-payment-form.page').then(
            (m) => m.IplBulkPaymentFormPage
          )
      },
      {
        path: 'ipl-payments/:id',
        loadComponent: () =>
          import('./features/admin/ipl-payments/ipl-payment-detail/ipl-payment-detail.page').then(
            (m) => m.IplPaymentDetailPage
          )
      },
      {
        path: 'ipl-payments/:id/edit',
        loadComponent: () =>
          import('./features/admin/ipl-payments/ipl-payment-form/ipl-payment-form.page').then(
            (m) => m.IplPaymentFormPage
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
