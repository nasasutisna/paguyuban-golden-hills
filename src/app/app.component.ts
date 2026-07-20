import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter, Subject, takeUntil, forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  IonApp, IonMenu, IonHeader, IonToolbar, IonContent, IonList,
  IonListHeader, IonMenuToggle, IonItem, IonIcon, IonLabel,
  IonRouterOutlet, IonButton, IonBadge, IonMenuButton, IonSplitPane, IonPopover, IonSpinner, NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  leaf, personCircle, personCircleOutline, menu, search, notificationsOutline,
  logOut, grid, cog, barChart, settings, openOutline, chevronForward,
  home, homeOutline, people, business, businessOutline, document, receipt, receiptOutline, wallet, trendingUp, calendar, calendarOutline,
  shield, key, keyOutline, lockClosed, prism, card, fileTray, chatbubbles, informationCircle,
  helpCircle, documentText, documentTextOutline, funnel, scan, cloudUpload, cloudDownload, swapHorizontal,
  create, createOutline, trashOutline, eyeOutline, addOutline, checkmarkOutline, closeOutline, pencilOutline,
  searchOutline,
  add,
  addCircle,
  addCircleOutline,
  personAdd,
  personOutline,
  chevronBack,
  arrowBack,
  chevronBackCircleOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  closeCircle,
  closeCircleOutline,
  callOutline,
  mailOutline,
  layersOutline,
  resizeOutline,
  star,
  warningOutline,
  buildOutline,
  expandOutline,
  medicalOutline,
  stopCircle,
  playCircle,
  swapHorizontalOutline,
  alertCircle,
  alertCircleOutline,
  saveOutline,
  time,
  walletOutline,
  cardOutline,
  cashOutline,
  newspaperOutline,
  pricetagOutline,
  textOutline,
  locationOutline,
  pieChartOutline,
  codeOutline,
  calendarClearOutline,
  calendarNumberOutline,
  trendingDown,
  chevronDownOutline,
  chevronUpOutline,
  filterOutline,
  informationCircleOutline,
  cloudOutline,
  cloudUploadOutline,
  timeOutline,
  checkmarkDoneOutline,
  lockClosedOutline,
  lockOpenOutline,
  peopleCircle,
  briefcaseOutline,
  barcodeOutline,
  location,
  peopleOutline,
  sendOutline,
  linkOutline,
  swapVerticalOutline,
  shieldCheckmarkOutline,
  listOutline,
  hourglass,
  personRemove,
  removeCircleOutline
} from 'ionicons/icons';
import { AuthService } from '@core/auth/auth.service';
import { User } from '@models/auth.model';
import { BreadcrumbComponent } from '@shared/ui/breadcrumb/breadcrumb.component';
import { IplPaymentsService } from '@features/admin/ipl-payments/ipl-payments.service';
import { IplPayment } from '@features/admin/ipl-payments/ipl-payments.model';
import { ResidentPaymentsService } from '@features/admin/resident-payments/resident-payments.service';
import { PaymentStatus, ResidentPayment } from '@features/admin/resident-payments/resident-payments.model';

interface MenuItem {
  title: string;
  url: string;
  icon: string;
  description?: string;
  badge?: string;
  external?: boolean;
}

/**
 * Unified approval item shown in the header notifications dropdown
 */
interface ApprovalItem {
  id: string;
  type: 'ipl' | 'resident_payment';
  typeLabel: string;
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  route: string[];
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    CommonModule,
    IonApp, IonMenu, IonHeader, IonToolbar, IonContent, IonList,
    IonListHeader, IonMenuToggle, IonItem, IonIcon, IonLabel,
    IonRouterOutlet, IonButton, IonBadge, IonMenuButton, IonSplitPane, IonPopover, IonSpinner,
    BreadcrumbComponent
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private navController = inject(NavController);
  private authService = inject(AuthService);
  private iplPaymentsService = inject(IplPaymentsService);
  private residentPaymentsService = inject(ResidentPaymentsService);
  private destroy$ = new Subject<void>();

  // Authentication state
  isAuthenticated = false;
  currentUser: User | null = null;

  // Pending approvals (header notifications)
  pendingApprovals: ApprovalItem[] = [];
  pendingCount = 0;
  loadingApprovals = false;

  // Current page info
  currentPageTitle = 'Dashboard';
  currentPageIcon = 'grid';
  currentUrl = '/dashboard';

  // Main Menu Items
  mainMenuItems: MenuItem[] = [
    { title: 'Dasbor', url: '/dashboard', icon: 'grid', description: 'Ringkasan & Statistik' },
  ];

  // Expense Requests (Pengajuan) — multi-role: PENGURUS/COORDINATOR submit,
  // ADMIN/ACCOUNTANT approve. Gated by canSeeExpenseRequests().
  expenseMenuItems: MenuItem[] = [
    { title: 'Request Pengeluaran', url: '/expense-requests', icon: 'receipt-outline', description: 'Ajukan Pengeluaran' },
  ];

  // Management Menu Items
  managementMenuItems: MenuItem[] = [
    { title: 'Warga', url: '/admin/residents', icon: 'people-circle', description: 'Kelola Warga' },
    { title: 'Unit Rumah', url: '/admin/house-units', icon: 'business-outline', description: 'Manajemen Unit Rumah' },
    { title: 'Blok', url: '/admin/house-blocks', icon: 'business', description: 'Manajemen Blok' },
    { title: 'Karyawan', url: '/admin/employees', icon: 'people', description: 'Manajemen Staf' },
    { title: 'Penggajian', url: '/admin/employee-salary-headers', icon: 'cash-outline', description: 'Gaji Karyawan → Kas IPL' },
  ];

  // Keuangan Menu Items
  keuanganMenuItems: MenuItem[] = [
    { title: 'Kas Paguyuban', url: '/admin/cash-transactions', icon: 'swap-horizontal', description: 'Catatan Keuangan' },
    { title: 'Jenis Iuran', url: '/admin/fee-types', icon: 'funnel', description: 'Kelola Jenis Iuran & IPL' },
    { title: 'Tagihan Warga', url: '/admin/resident-invoices', icon: 'document', description: 'Daftar Tagihan Warga' },

  ];

  // IPL Menu Items
  iplMenuItems: MenuItem[] = [
    { title: 'Pembayaran IPL', url: '/admin/ipl-payments', icon: 'wallet-outline', description: 'Daftar Pembayaran IPL' },
    { title: 'Matrix IPL', url: '/admin/ipl-payment-matrix', icon: 'grid', description: 'Status bayar unit per bulan' },
    { title: 'Iuran Warga', url: '/admin/resident-payments', icon: 'card-outline', description: 'Riwayat Pembayaran' },
    { title: 'Matrix Iuran Warga', url: '/admin/resident-payment-matrix', icon: 'grid', description: 'Status bayar warga per bulan' },
    { title: 'Periode IPL', url: '/admin/ipl-periods', icon: 'calendar', description: 'Kelola Periode IPL' },
  ];

  // Reports Menu Items
  reportsMenuItems: MenuItem[] = [
    // { title: 'Laporan Keuangan', url: '/admin/reports/financial', icon: 'trending-up', description: 'Pemasukan & Pengeluaran' },
    // { title: 'Laporan Bulanan', url: '/admin/reports/monthly', icon: 'calendar', description: 'Ringkasan Bulanan' },
    { title: 'Laporan IPL', url: '/admin/cash-transactions/reports/ipl', icon: 'document-text-outline', description: 'Laporan Pembayaran IPL' },
    { title: 'Laporan Kegiatan', url: '/admin/cash-transactions/reports/kegiatan', icon: 'calendar-outline', description: 'Laporan Transaksi Kegiatan' },
    // { title: 'Log Aktivitas', url: '/admin/reports/activity', icon: 'receipt', description: 'Aktivitas Sistem' },
  ];

  // Settings Menu Items
  settingsMenuItems: MenuItem[] = [
    { title: 'Pengaturan Umum', url: '/admin/settings/general', icon: 'settings', description: 'Konfigurasi Aplikasi' },
    { title: 'Keamanan', url: '/admin/settings/security', icon: 'shield', description: 'Keamanan & Akses' },
    { title: 'Role & Izin', url: '/admin/settings/roles', icon: 'key', description: 'Role Pengguna' },
    { title: 'Backup & Restore', url: '/admin/settings/backup', icon: 'cloud-upload', description: 'Manajemen Data' },
  ];

  constructor() {
    // Register all icons
    addIcons({
      leaf, personCircle, personCircleOutline, personOutline, menu, search, notificationsOutline,
      logOut, grid, cog, barChart, settings, openOutline, chevronForward,
      home, homeOutline, people, business, businessOutline, document, receipt, receiptOutline, wallet, trendingUp, calendar, calendarOutline,
      shield, key, keyOutline, lockClosed, prism, card, fileTray, chatbubbles, informationCircle,
      helpCircle, documentText, documentTextOutline, funnel, scan, cloudUpload, cloudDownload, swapHorizontal,
      create, createOutline, trashOutline, eyeOutline, addOutline, checkmarkOutline, closeOutline, pencilOutline,
      searchOutline, add, addCircle, personAdd, addCircleOutline, chevronBack, arrowBack,
      chevronBackCircleOutline, checkmarkCircle, checkmarkCircleOutline, closeCircle, closeCircleOutline, callOutline, mailOutline,
      layersOutline, resizeOutline, star, warningOutline, buildOutline, expandOutline,
      medicalOutline, stopCircle, playCircle, swapHorizontalOutline, alertCircle, alertCircleOutline, saveOutline, time,
      walletOutline, cardOutline, cashOutline, newspaperOutline, pricetagOutline, textOutline, locationOutline,
      pieChartOutline, codeOutline, calendarClearOutline, calendarNumberOutline, trendingDown,
      chevronDownOutline, chevronUpOutline, filterOutline, informationCircleOutline, cloudOutline, cloudUploadOutline,
      timeOutline, checkmarkDoneOutline, lockClosedOutline, lockOpenOutline, peopleCircle, briefcaseOutline, barcodeOutline,
      location, peopleOutline, sendOutline, linkOutline, swapVerticalOutline, shieldCheckmarkOutline, listOutline, hourglass, personRemove,
      removeCircleOutline
    });
  }

  ngOnInit() {
    // Subscribe to auth state changes
    this.authService.authState.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.isAuthenticated = state.isAuthenticated;
      this.currentUser = state.user;

      // Load pending approvals for the notification bell
      this.loadPendingApprovals();
    });

    // Initialize page info from current URL
    this.updatePageInfo(this.router.url);

    // Listen for route changes to update page info
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.updatePageInfo(event.url);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get user display name
   */
  get userDisplayName(): string {
    if (!this.currentUser) return 'User';
    if (this.currentUser.firstName && this.currentUser.lastName) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }
    return this.currentUser.username;
  }

  /**
   * Get user role display name
   */
  get userRoleDisplay(): string {
    if (!this.currentUser) return '';
    // Use role.name if available, otherwise fallback to roleId mapping
    if (this.currentUser.role?.name) {
      return this.formatRoleName(this.currentUser.role.name);
    }
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrator',
      'moderator': 'Moderator',
      'default-user-role': 'User'
    };
    return roleMap[this.currentUser.roleId] || 'User';
  }

  /**
   * Format role name for display (e.g., SUPERADMIN -> Superadmin)
   */
  private formatRoleName(roleName: string): string {
    return roleName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toLowerCase())
      .replace(/^\w/, c => c.toUpperCase());
  }

  private updatePageInfo(url: string) {
    this.currentUrl = url;

    const pageMap: { [key: string]: { title: string; icon: string } } = {
      '/dashboard': { title: 'Dasbor', icon: 'grid' },
      '/expense-requests': { title: 'Request Pengeluaran', icon: 'receipt-outline' },
      '/profile': { title: 'Profil', icon: 'person-circle' },
      '/admin/residents': { title: 'Warga', icon: 'home' },
      '/admin/employees': { title: 'Karyawan', icon: 'people' },
      '/admin/employee-salary-headers': { title: 'Penggajian', icon: 'cash-outline' },
      '/admin/house-units': { title: 'Unit Rumah', icon: 'business-outline' },
      '/admin/house-blocks': { title: 'Blok', icon: 'business' },
      '/admin/fee-types': { title: 'Jenis Iuran', icon: 'funnel' },
      '/admin/resident-invoices': { title: 'Tagihan Warga', icon: 'document' },
      '/admin/resident-payments': { title: 'Pembayaran', icon: 'card-outline' },
      '/admin/transactions': { title: 'Kas Paguyuban', icon: 'swap-horizontal' },
      '/admin/ipl-periods': { title: 'Periode IPL', icon: 'calendar' },
      '/admin/ipl-payments': { title: 'Pembayaran IPL', icon: 'wallet-outline' },
      '/admin/ipl-payment-matrix': { title: 'Matrix Pembayaran IPL', icon: 'grid' },
      '/admin/cash-transactions/reports/ipl': { title: 'Laporan IPL', icon: 'document-text-outline' },
      '/admin/cash-transactions/reports/kegiatan': { title: 'Laporan Kegiatan', icon: 'calendar-outline' },
    };

    // Find matching page
    for (const [path, info] of Object.entries(pageMap)) {
      if (url.startsWith(path)) {
        this.currentPageTitle = info.title;
        this.currentPageIcon = info.icon;
        break;
      }
    }

    // Default
    if (!this.currentPageTitle || this.currentPageTitle === 'Golden Hills Admin') {
      this.currentPageTitle = 'Golden Hills Admin';
      this.currentPageIcon = 'leaf';
    }
  }

  /**
   * Navigate using setRoot (clears navigation history)
   */
  navigateWithSetRoot(url: string) {
    this.navController.navigateRoot(url);
  }

  /**
   * Check if menu item is currently active
   */
  isActiveMenu(url: string): boolean {
    return this.currentUrl.startsWith(url);
  }

  /**
   * Whether the current user may access the Expense Requests feature.
   * Backend `/mine` is open to all authenticated roles; gate the menu to the
   * known role set so unrelated users don't see a dead link.
   */
  canSeeExpenseRequests(): boolean {
    const role = this.currentUser?.role?.name || '';
    return [
      'PENGURUS', 'COORDINATOR', 'ADMIN', 'ACCOUNTANT', 'MANAGER', 'SUPERADMIN', 'STAFF',
    ].includes(role);
  }

  /**
   * Logout and clear auth data
   */
  onLogout() {
    this.authService.logout().subscribe({
      next: () => {
        // Use bypass parameter to prevent guestGuard from redirecting back to dashboard
        this.router.navigate(['/auth/login'], { queryParams: { bypass: 'true' } });
      },
      error: () => {
        // Even if API fails, navigate to login with bypass
        this.router.navigate(['/auth/login'], { queryParams: { bypass: 'true' } });
      }
    });
  }

  /**
   * Load pending approvals for IPL & resident payments (notification bell).
   * IPL uses a dedicated pending endpoint; resident payments are filtered
   * client-side because the service does not support status filtering.
   */
  loadPendingApprovals() {
    if (!this.isAuthenticated) {
      this.pendingApprovals = [];
      this.pendingCount = 0;
      return;
    }

    this.loadingApprovals = true;
    forkJoin({
      ipl: this.iplPaymentsService.getPending({ page: 1, limit: 50 }),
      resident: this.residentPaymentsService.getAll({ page: 1, limit: 50 }),
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ ipl, resident }) => {
          const iplItems = (ipl?.data || []).map(p => this.mapIplToApproval(p));
          const residentItems = (resident?.data || [])
            .filter(p => p.status === PaymentStatus.PENDING)
            .map(p => this.mapResidentPaymentToApproval(p));

          this.pendingApprovals = [...iplItems, ...residentItems]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          this.pendingCount = this.pendingApprovals.length;
          this.loadingApprovals = false;
        },
        error: () => {
          this.pendingApprovals = [];
          this.pendingCount = 0;
          this.loadingApprovals = false;
        },
      });
  }

  private mapIplToApproval(p: IplPayment): ApprovalItem {
    const residentName = p.resident
      ? `${p.resident.firstName} ${p.resident.lastName ?? ''}`.trim()
      : p.paymentNumber;
    const unit = p.resident?.unitNumber || p.houseUnit?.unitNumber || '';
    const period = p.period?.periodName || '';
    return {
      id: p.id,
      type: 'ipl',
      typeLabel: 'IPL',
      title: residentName,
      subtitle: [unit, period].filter(Boolean).join(' • ') || '-',
      amount: p.calculatedAmount,
      date: p.paymentDate,
      route: ['/admin/ipl-payments', p.id],
    };
  }

  private mapResidentPaymentToApproval(p: ResidentPayment): ApprovalItem {
    const residentName = p.resident
      ? `${p.resident.firstName} ${p.resident.lastName ?? ''}`.trim()
      : p.paymentNumber;
    const unit = p.resident?.unitNumber || '';
    const invoice = p.invoice?.invoiceNumber || '';
    return {
      id: p.id,
      type: 'resident_payment',
      typeLabel: 'Iuran Warga',
      title: residentName,
      subtitle: [unit, invoice].filter(Boolean).join(' • ') || '-',
      amount: p.amount,
      date: p.paymentDate,
      route: ['/admin/resident-payments', p.id],
    };
  }

  /**
   * Navigate to an approval detail page
   */
  navigateToApproval(route: string[]) {
    this.navController.navigateRoot(route);
  }

  /**
   * Format amount to IDR currency (no decimals)
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }
}
