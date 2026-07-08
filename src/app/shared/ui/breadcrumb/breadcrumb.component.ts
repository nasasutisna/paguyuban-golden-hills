import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronForward,
  grid,
  home,
  homeOutline,
  people,
  business,
  businessOutline,
  document,
  receipt,
  trendingUp,
  calendar,
  shield,
  key,
  settings,
  cloudUpload
} from 'ionicons/icons';

interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
  skip?: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  imports: [
    CommonModule,
    IonIcon,
  ],
  standalone: true
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  breadcrumbs: BreadcrumbItem[] = [];

  // Store route data for skip checking
  private routeDataMap = new Map<string, any>();

  constructor() {
    addIcons({
      chevronForward,
      grid,
      home,
      homeOutline,
      people,
      business,
      businessOutline,
      document,
      receipt,
      trendingUp,
      calendar,
      shield,
      key,
      settings,
      cloudUpload
    });
  }

  ngOnInit() {
    // Initialize from current URL
    this.updateBreadcrumbs(this.router.url);

    // Listen for route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.updateBreadcrumbs(event.url);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateBreadcrumbs(url: string) {
    this.breadcrumbs = this.generateBreadcrumbs(url);
  }

  private generateBreadcrumbs(url: string): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [];
    const pathSegments = url.split('/').filter(segment => segment.length > 0);

    // Handle empty URL or root path
    if (!url || url === '/' || url === '') {
      return [{ label: 'Home', url: '/dashboard', icon: 'grid' }];
    }

    // Always add home as first breadcrumb
    breadcrumbs.push({ label: 'Home', url: '/dashboard', icon: 'grid' });

    // Build the route data map from router config
    this.buildRouteDataMap();

    if (pathSegments.length === 0) {
      return breadcrumbs;
    }

    let currentPath = '';
    const labelMap: { [key: string]: string } = {
      'admin': 'Admin',
      'dashboard': 'Dashboard',
      'profile': 'Profile',
      'residents': 'Residents',
      'employees': 'Employees',
      'house-units': 'House Units',
      'house-blocks': 'House Blocks',
      'transactions': 'Transactions',
      'invoices': 'Invoices',
      'reports': 'Reports',
      'financial': 'Financial',
      'monthly': 'Monthly',
      'activity': 'Activity Logs',
      'settings': 'Settings',
      'general': 'General',
      'security': 'Security',
      'roles': 'Roles & Permissions',
      'backup': 'Backup & Restore',
      'new': 'New',
      'edit': 'Edit'
    };

    const iconMap: { [key: string]: string } = {
      'dashboard': 'grid',
      'home': 'home',
      'residents': 'people',
      'employees': 'people',
      'house-units': 'business-outline',
      'house-blocks': 'business',
      'transactions': 'receipt',
      'invoices': 'document',
      'reports': 'trending-up',
      'settings': 'settings',
      'security': 'shield',
      'roles': 'key',
      'backup': 'cloud-upload'
    };

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += '/' + segment;

      // Check if this route should be skipped
      if (this.shouldSkipRoute(currentPath)) {
        continue;
      }

      // Skip dynamic segments (IDs) for URL, but show appropriate label
      if (/^\d+$/.test(segment) || segment === 'new' || segment === 'edit') {
        const parentSegment = i > 0 ? pathSegments[i - 1] : '';
        const isDetailPage = /^\d+$/.test(segment);
        const isNewPage = segment === 'new';
        const isEditPage = segment === 'edit';

        if (isDetailPage) {
          const parentLabel = labelMap[parentSegment] || this.formatLabel(parentSegment);
          breadcrumbs.push({ label: `${parentLabel} Detail` });
        } else if (isNewPage) {
          const parentLabel = labelMap[parentSegment] || this.formatLabel(parentSegment);
          breadcrumbs.push({ label: `New ${parentLabel.slice(0, -1)}` });
        } else if (isEditPage) {
          const parentLabel = labelMap[parentSegment] || this.formatLabel(parentSegment);
          breadcrumbs.push({ label: `Edit ${parentLabel.slice(0, -1)}` });
        }
      } else {
        // Regular segment
        const label = labelMap[segment] || this.formatLabel(segment);
        const icon = iconMap[segment];
        breadcrumbs.push({ label, url: currentPath, icon });
      }
    }

    return breadcrumbs;
  }

  private formatLabel(segment: string): string {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private buildRouteDataMap() {
    this.routeDataMap.clear();
    const routes = this.router.config;

    const processRoute = (route: any, basePath = '') => {
      if (route.path && route.data) {
        const fullPath = basePath + '/' + route.path;
        this.routeDataMap.set(fullPath, route.data);
      }

      if (route.children) {
        const newBasePath = route.path ? basePath + '/' + route.path : basePath;
        route.children.forEach((child: any) => processRoute(child, newBasePath));
      }
    };

    routes.forEach(route => processRoute(route, ''));
  }

  private shouldSkipRoute(path: string): boolean {
    // Only check exact path match, not parent paths
    const exactPath = this.routeDataMap.get(path);
    if (exactPath?.breadcrumb?.skip) {
      return true;
    }

    return false;
  }

  navigate(url: string) {
    this.router.navigateByUrl(url);
  }
}
