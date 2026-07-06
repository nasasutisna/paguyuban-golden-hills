import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  IonApp, IonMenu, IonHeader, IonToolbar, IonContent, IonList,
  IonListHeader, IonMenuToggle, IonItem, IonIcon, IonLabel,
  IonRouterOutlet, IonButton, IonBadge, IonMenuButton, IonSplitPane
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  leaf, personCircle, personCircleOutline, menu, search, notificationsOutline,
  logOut, grid, cog, barChart, settings, openOutline, chevronForward,
  home, people, business, document, receipt, wallet, trendingUp, calendar,
  shield, key, lockClosed, prism, card, fileTray, chatbubbles, informationCircle,
  helpCircle, documentText, funnel, scan, cloudUpload, cloudDownload, swapHorizontal
} from 'ionicons/icons';
import { AuthService } from '@core/auth/auth.service';
import { User } from '@models/auth.model';

interface MenuItem {
  title: string;
  url: string;
  icon: string;
  description?: string;
  badge?: string;
  external?: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonApp, IonMenu, IonHeader, IonToolbar, IonContent, IonList,
    IonListHeader, IonMenuToggle, IonItem, IonIcon, IonLabel,
    IonRouterOutlet, IonButton, IonBadge, IonMenuButton, IonSplitPane
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  // Authentication state
  isAuthenticated = false;
  currentUser: User | null = null;

  // Current page info
  currentPageTitle = 'Dashboard';
  currentPageIcon = 'grid';

  // Main Menu Items
  mainMenuItems: MenuItem[] = [
    { title: 'Dashboard', url: '/dashboard', icon: 'grid', description: 'Overview & Statistics' },
    { title: 'Profile', url: '/profile', icon: 'person-circle', description: 'Account Settings' },
  ];

  // Management Menu Items
  managementMenuItems: MenuItem[] = [
    { title: 'Residents', url: '/admin/residents', icon: 'home', description: 'Manage Residents' },
    { title: 'Employees', url: '/admin/employees', icon: 'people', description: 'Staff Management' },
    { title: 'House Blocks', url: '/admin/house-blocks', icon: 'business', description: 'Building Management' },
    { title: 'Transactions', url: '/admin/transactions', icon: 'swap-horizontal', description: 'Financial Records' },
    { title: 'Invoices', url: '/admin/invoices', icon: 'document', description: 'Billing & Invoices' },
  ];

  // Reports Menu Items
  reportsMenuItems: MenuItem[] = [
    { title: 'Financial Reports', url: '/admin/reports/financial', icon: 'trending-up', description: 'Income & Expenses' },
    { title: 'Monthly Reports', url: '/admin/reports/monthly', icon: 'calendar', description: 'Monthly Summaries' },
    { title: 'Activity Logs', url: '/admin/reports/activity', icon: 'receipt', description: 'System Activities' },
  ];

  // Settings Menu Items
  settingsMenuItems: MenuItem[] = [
    { title: 'General Settings', url: '/admin/settings/general', icon: 'settings', description: 'App Configuration' },
    { title: 'Security', url: '/admin/settings/security', icon: 'shield', description: 'Security & Access' },
    { title: 'Roles & Permissions', url: '/admin/settings/roles', icon: 'key', description: 'User Roles' },
    { title: 'Backup & Restore', url: '/admin/settings/backup', icon: 'cloud-upload', description: 'Data Management' },
  ];

  constructor() {
    // Register all icons
    addIcons({
      leaf, personCircle, personCircleOutline, menu, search, notificationsOutline,
      logOut, grid, cog, barChart, settings, openOutline, chevronForward,
      home, people, business, document, receipt, wallet, trendingUp, calendar,
      shield, key, lockClosed, prism, card, fileTray, chatbubbles, informationCircle,
      helpCircle, documentText, funnel, scan, cloudUpload, cloudDownload, swapHorizontal
    });
  }

  ngOnInit() {
    // Subscribe to auth state changes
    this.authService.authState.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.isAuthenticated = state.isAuthenticated;
      this.currentUser = state.user;

      // Redirect to login if not authenticated and not on auth pages
      // const currentUrl = this.router.url;
      // if (!state.isAuthenticated && !currentUrl.startsWith('/auth/')) {
      //   this.router.navigate(['/auth/login']);
      // }
    });

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
    const pageMap: { [key: string]: { title: string; icon: string } } = {
      '/dashboard': { title: 'Dashboard', icon: 'grid' },
      '/profile': { title: 'Profile', icon: 'person-circle' },
      '/admin/residents': { title: 'Residents', icon: 'home' },
      '/admin/employees': { title: 'Employees', icon: 'people' },
      '/admin/house-blocks': { title: 'House Blocks', icon: 'business' },
      '/admin/transactions': { title: 'Transactions', icon: 'receipt' },
      '/admin/invoices': { title: 'Invoices', icon: 'document' },
    };

    // Find matching page
    for (const [path, info] of Object.entries(pageMap)) {
      if (url.startsWith(path)) {
        this.currentPageTitle = info.title;
        this.currentPageIcon = info.icon;
        return;
      }
    }

    // Default
    this.currentPageTitle = 'Golden Hills Admin';
    this.currentPageIcon = 'leaf';
  }

  /**
   * Logout and clear auth data
   */
  onLogout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        // Even if API fails, navigate to login
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
