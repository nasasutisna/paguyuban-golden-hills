import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, Router, NavigationEnd } from '@angular/router';
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
  private activatedRoute = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  breadcrumbs: BreadcrumbItem[] = [];

  // Maps for the legacy per-segment fallback (routes without data.breadcrumb.label).
  private static readonly LABEL_MAP: { [key: string]: string } = {
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

  private static readonly ICON_MAP: { [key: string]: string } = {
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
    // Build from the current activated route, then refresh on every navigation.
    this.updateBreadcrumbs();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateBreadcrumbs();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateBreadcrumbs() {
    this.breadcrumbs = this.generateBreadcrumbs();
  }

  /**
   * Walk the ActivatedRoute snapshot tree (root → leaf). Each route level may
   * declare its own breadcrumb via `data.breadcrumb`, read from the route's OWN
   * config (snap.routeConfig.data) — NOT the merged/inherited data — so a
   * parent's `{ skip: true }` (e.g. /admin) does not hide its children. Levels
   * without a label fall back to the legacy per-segment labeler, preserving the
   * previous breadcrumb for all existing unlabeled routes.
   */
  private generateBreadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [{ label: 'Home', url: '/dashboard', icon: 'grid' }];

    let url = '';
    let snap: ActivatedRouteSnapshot | null = this.activatedRoute.root.snapshot;

    while (snap) {
      const segments = snap.url.map(s => s.path);
      const segPath = segments.join('/');
      const bc = snap.routeConfig?.data?.['breadcrumb'];

      if (bc?.skip) {
        // Advance the cumulative URL so child levels resolve correctly.
        if (segPath) url += '/' + segPath;
      } else if (bc?.label) {
        if (segPath) url += '/' + segPath;
        items.push({ label: bc.label, url, icon: bc.icon });
      } else if (segments.length > 0) {
        // Legacy per-segment fallback.
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          url += '/' + seg;
          this.pushLegacyItem(items, seg, url, segments[i - 1]);
        }
      }

      snap = snap.firstChild;
    }

    return items;
  }

  /**
   * Legacy per-segment breadcrumb item (used when a route level has no
   * `data.breadcrumb.label`). Mirrors the previous URL-string-based behavior.
   */
  private pushLegacyItem(
    items: BreadcrumbItem[],
    segment: string,
    url: string,
    parentSegment: string | undefined
  ): void {
    const labelMap = BreadcrumbComponent.LABEL_MAP;
    const parentLabel = parentSegment
      ? (labelMap[parentSegment] || this.formatLabel(parentSegment))
      : '';

    if (/^\d+$/.test(segment)) {
      items.push({ label: `${parentLabel} Detail` });
    } else if (segment === 'new') {
      items.push({ label: `New ${parentLabel.slice(0, -1)}` });
    } else if (segment === 'edit') {
      items.push({ label: `Edit ${parentLabel.slice(0, -1)}` });
    } else {
      items.push({
        label: labelMap[segment] || this.formatLabel(segment),
        url,
        icon: BreadcrumbComponent.ICON_MAP[segment]
      });
    }
  }

  private formatLabel(segment: string): string {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  navigate(url: string) {
    this.router.navigateByUrl(url);
  }
}
