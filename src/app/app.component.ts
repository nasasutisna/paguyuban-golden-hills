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
  removeCircleOutline,
  logoWhatsapp,
  megaphoneOutline,
  pauseCircleOutline,
  playCircleOutline,
  person
} from 'ionicons/icons';
import { AuthService } from '@core/auth/auth.service';
import { User } from '@models/auth.model';
import { getRequiredRoles } from '@core/guards/role-access.config';
import { BreadcrumbComponent } from '@shared/ui/breadcrumb/breadcrumb.component';
import { IplPaymentsService } from '@features/admin/ipl-payments/ipl-payments.service';
import { IplPayment } from '@features/admin/ipl-payments/ipl-payments.model';
import { ResidentPaymentsService } from '@features/admin/resident-payments/resident-payments.service';
import { PaymentStatus, ResidentPayment } from '@features/admin/resident-payments/resident-payments.model';
import { ExpenseRequestsService } from '@features/expense-requests/expense-requests.service';
import { ExpenseRequest } from '@features/expense-requests/expense-requests.model';

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
  type: 'ipl' | 'resident_payment' | 'expense_request';
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
  private expenseRequestsService = inject(ExpenseRequestsService);
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
    { title: 'Pengguna', url: '/admin/users', icon: 'people', description: 'Pengguna' },
  ];

  // Keuangan Menu Items
  keuanganMenuItems: MenuItem[] = [
    { title: 'Kas Paguyuban', url: '/admin/cash-transactions', icon: 'swap-horizontal', description: 'Catatan Keuangan' },
    // { title: 'Jenis Iuran', url: '/admin/fee-types', icon: 'funnel', description: 'Kelola Jenis Iuran & IPL' },
    // { title: 'Tagihan Warga', url: '/admin/resident-invoices', icon: 'document', description: 'Daftar Tagihan Warga' },
  ];

  // IPL Menu Items
  iplMenuItems: MenuItem[] = [
    { title: 'IPL Warga', url: '/admin/ipl-payment-matrix', icon: 'wallet-outline', description: 'Daftar Pembayaran IPL' },
    // { title: 'Matrix IPL', url: '/admin/ipl-payment-matrix', icon: 'grid', description: 'Status bayar unit per bulan' },
    { title: 'Blast WhatsApp', url: '/admin/whatsapp-blast', icon: 'logo-whatsapp', description: 'Kirim reminder WA tunggakan IPL' },
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
    { title: 'Pengaturan Whatsapp', url: '/admin/setting-whatsapp', icon: 'logo-whatsapp', description: 'Koneksi & tes kirim WA' },
    // { title: 'Keamanan', url: '/admin/settings/security', icon: 'shield', description: 'Keamanan & Akses' },
    // { title: 'Role & Izin', url: '/admin/settings/roles', icon: 'key', description: 'Role Pengguna' },
    { title: 'Backup & Restore', url: '/admin/settings/backup', icon: 'cloud-upload', description: 'Manajemen Data' },
  ];

  // Role-filtered menus shown in the side bar. Recomputed whenever the auth
  // state (and therefore the current role) changes — see refreshVisibleMenus().
  visibleMainMenuItems: MenuItem[] = [];
  visibleExpenseMenuItems: MenuItem[] = [];
  visibleIplMenuItems: MenuItem[] = [];
  visibleKeuanganMenuItems: MenuItem[] = [];
  visibleReportsMenuItems: MenuItem[] = [];
  visibleManagementMenuItems: MenuItem[] = [];
  visibleSettingsMenuItems: MenuItem[] = [];

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
      removeCircleOutline, logoWhatsapp, megaphoneOutline, pauseCircleOutline, playCircleOutline, person
    });
  }

  ngOnInit() {
    // Subscribe to auth state changes
    this.authService.authState.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.isAuthenticated = state.isAuthenticated;
      this.currentUser = state.user;

      // Recompute role-filtered menus for the current user.
      this.refreshVisibleMenus();

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
      '/admin/whatsapp-blast': { title: 'Blast WhatsApp', icon: 'logo-whatsapp' },
      '/admin/setting-whatsapp': { title: 'Pengaturan WhatsApp', icon: 'logo-whatsapp' },
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
   * Whether the current user may see a menu item. Roles are resolved from the
   * item's URL via the shared ROUTE_ROLE_RULES map (same map the route guard
   * uses), so the menu can never offer a page the guard would block.
   * SUPERADMIN sees everything; items with no rule are shown to everyone.
   */
  private canSeeMenuItem(item: MenuItem): boolean {
    const role = this.currentUser?.role?.name || '';
    if (!role) return false;
    if (role === 'SUPERADMIN') return true;
    const required = getRequiredRoles(item.url);
    return !required || required.length === 0 || required.includes(role);
  }

  private filterMenu(items: MenuItem[]): MenuItem[] {
    return items.filter(item => this.canSeeMenuItem(item));
  }

  /**
   * Recompute every role-filtered menu. Called on auth state changes (login,
   * logout, profile refresh). Empty sections collapse in the template.
   */
  private refreshVisibleMenus(): void {
    this.visibleMainMenuItems = this.filterMenu(this.mainMenuItems);
    this.visibleExpenseMenuItems = this.filterMenu(this.expenseMenuItems);
    this.visibleIplMenuItems = this.filterMenu(this.iplMenuItems);
    this.visibleKeuanganMenuItems = this.filterMenu(this.keuanganMenuItems);
    this.visibleReportsMenuItems = this.filterMenu(this.reportsMenuItems);
    this.visibleManagementMenuItems = this.filterMenu(this.managementMenuItems);
    this.visibleSettingsMenuItems = this.filterMenu(this.settingsMenuItems);
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
   * Load pending approvals for IPL, resident payments & expense requests
   * (notification bell). IPL & expense use dedicated pending endpoints;
   * resident payments are filtered client-side because the service does not
   * support status filtering. Each branch self-heals to an empty list on
   * error (e.g. 403 for non-admin roles) so one failing call won't clear the
   * others.
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
      expense: this.expenseRequestsService.getPending({ page: 1, limit: 50 }),
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ ipl, resident, expense }) => {
          const iplItems = (ipl?.data || []).map(p => this.mapIplToApproval(p));
          const residentItems = (resident?.data || [])
            .filter(p => p.status === PaymentStatus.PENDING)
            .map(p => this.mapResidentPaymentToApproval(p));
          const expenseItems = (expense?.data || []).map(r => this.mapExpenseRequestToApproval(r));

          this.pendingApprovals = [...iplItems, ...residentItems, ...expenseItems]
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
   * Map a pending expense request (Pengeluaran) to a bell item. The fund type
   * (IPL vs WARGA) comes from the request's category and is surfaced in the
   * type label so "Pengeluaran IPL" is distinguishable from "Pengeluaran Warga".
   */
  private mapExpenseRequestToApproval(r: ExpenseRequest): ApprovalItem {
    const fundType = r.category?.fundType;
    const typeLabel = fundType === 'IPL'
      ? 'Pengeluaran IPL'
      : fundType === 'WARGA'
        ? 'Pengeluaran Warga'
        : 'Pengeluaran';
    const requesterName = r.requester
      ? `${r.requester.firstName ?? ''} ${r.requester.lastName ?? ''}`.trim() || r.requester.username
      : r.requestNumber;
    const category = r.category?.categoryName || '';
    return {
      id: r.id,
      type: 'expense_request',
      typeLabel,
      title: r.title || requesterName,
      subtitle: [requesterName, category].filter(Boolean).join(' • ') || r.requestNumber || '-',
      amount: Number(r.amount) || 0,
      date: r.transactionDate || r.createdAt,
      route: ['/expense-requests', r.id],
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