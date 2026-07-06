import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ResidentsService } from './residents.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { AlertController } from '@ionic/angular';
import {
  Resident,
  ResidentStats,
  Gender,
  MaritalStatus,
  OwnershipType,
  GENDER_COLORS,
  OWNERSHIP_TYPE_COLORS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
  OWNERSHIP_TYPE_LABELS
} from './residents.model';
import { TableConfig, TableAction, TableDataSource } from '@shared/ui/table/table.model';
import { TableComponent } from '@shared/ui/table/table.component';

/**
 * Residents List Page
 * Displays statistics cards and table of residents with CRUD operations
 */
@Component({
  selector: 'app-residents',
  standalone: true,
  imports: [CommonModule, IonicModule, TableComponent],
  templateUrl: './residents.page.html',
  styleUrls: ['./residents.page.scss']
})
export class ResidentsPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private residentsService = inject(ResidentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  // Data
  residents: Resident[] = [];
  residentStats: ResidentStats | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  // Loading states
  loading = true;
  statsLoading = true;

  // Table configuration
  tableConfig: TableConfig = {
    columns: [
      { key: 'residentCode', header: 'Code', type: 'text', sortable: true },
      { key: 'firstName', header: 'First Name', type: 'text', sortable: true },
      { key: 'lastName', header: 'Last Name', type: 'text', sortable: true },
      { key: 'email', header: 'Email', type: 'text' },
      { key: 'phoneNumber', header: 'Phone', type: 'text' },
      { key: 'gender', header: 'Gender', type: 'status', sortable: true },
      { key: 'maritalStatus', header: 'Marital Status', type: 'status', sortable: true },
      { key: 'ownershipType', header: 'Ownership', type: 'status', sortable: true },
      { key: 'unitNumber', header: 'Unit', type: 'text', sortable: true },
      { key: 'houseBlock.blockName', header: 'Block', type: 'text' },
      { key: 'isActive', header: 'Status', type: 'status', sortable: true },
      { key: 'createdAt', header: 'Created', type: 'date', sortable: true }
    ],
    actions: [
      {
        id: 'view',
        label: 'View',
        icon: 'eye-outline',
        color: 'medium',
        handler: (item) => this.navigateToView(item)
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: 'create',
        color: 'primary',
        handler: (item) => this.navigateToEdit(item)
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: 'trash-outline',
        color: 'danger',
        handler: (item) => this.confirmDelete(item),
        confirm: {
          title: 'Delete Resident',
          message: 'Are you sure you want to delete this resident? This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel'
        }
      }
    ],
    sortable: false,
    filterable: true,
    pagination: true,
    pageSize: this.pageSize,
    pageSizeOptions: [10, 25, 50],
    showHeader: true,
    showFooter: true,
    striped: true,
    hoverable: true,
    emptyMessage: 'No residents found',
    loadingMessage: 'Loading residents...'
  };

  // Table data source
  dataSource: TableDataSource<Resident> = {
    data: [],
    loading: false
  };

  // Status badges for table
  statusBadges = [
    { value: true, label: 'Active', color: 'success', icon: 'checkmark-circle' },
    { value: false, label: 'Inactive', color: 'medium', icon: 'close-circle' },
    { value: Gender.MALE, label: GENDER_LABELS[Gender.MALE], color: GENDER_COLORS[Gender.MALE] },
    { value: Gender.FEMALE, label: GENDER_LABELS[Gender.FEMALE], color: GENDER_COLORS[Gender.FEMALE] },
    { value: Gender.OTHER, label: GENDER_LABELS[Gender.OTHER], color: GENDER_COLORS[Gender.OTHER] },
    { value: MaritalStatus.SINGLE, label: MARITAL_STATUS_LABELS[MaritalStatus.SINGLE], color: 'primary' },
    { value: MaritalStatus.MARRIED, label: MARITAL_STATUS_LABELS[MaritalStatus.MARRIED], color: 'success' },
    { value: MaritalStatus.DIVORCED, label: MARITAL_STATUS_LABELS[MaritalStatus.DIVORCED], color: 'warning' },
    { value: MaritalStatus.WIDOWED, label: MARITAL_STATUS_LABELS[MaritalStatus.WIDOWED], color: 'medium' },
    { value: OwnershipType.OWNER, label: OWNERSHIP_TYPE_LABELS[OwnershipType.OWNER], color: OWNERSHIP_TYPE_COLORS[OwnershipType.OWNER] },
    { value: OwnershipType.RENTER, label: OWNERSHIP_TYPE_LABELS[OwnershipType.RENTER], color: OWNERSHIP_TYPE_COLORS[OwnershipType.RENTER] }
  ];

  private subscriptions: Subscription[] = [];

  constructor() { }

  ngOnInit(): void {
    this.loadAllData();

    // Listen for router navigation events to reload data when returning to this page
    this.subscriptions.push(
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        // Reload data when navigating to the residents page
        if (event.url === '/admin/residents' || event.urlAfterRedirects === '/admin/residents') {
          this.loadAllData();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Load all data (stats and list)
   */
  private loadAllData(): void {
    this.loading = true;
    this.loadResidentStats();
    this.loadResidents();
  }

  /**
   * Load resident statistics
   */
  private loadResidentStats(): void {
    this.statsLoading = true;

    this.subscriptions.push(
      this.residentsService.getResidentStats().subscribe({
        next: (stats) => {
          this.residentStats = stats;
          this.statsLoading = false;
        },
        error: (error) => {
          console.error('Error loading resident stats:', error);
          this.statsLoading = false;
        }
      })
    );
  }

  /**
   * Load residents list
   */
  loadResidents(): void {
    this.dataSource.loading = true;

    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const
    };

    this.subscriptions.push(
      this.residentsService.getAll(params).subscribe({
        next: (response) => {
          console.log('residents response', response);
          this.residents = response.data;
          this.dataSource = {
            data: response.data,
            loading: false,
            total: response.total,
            totalPages: response.totalPages
          };
          this.totalItems = response.total || 0;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading residents:', error);
          this.toastService.error('Failed to load residents');
          this.dataSource = {
            data: [],
            loading: false,
            total: 0
          };
          this.loading = false;
        }
      })
    );
  }

  /**
   * Handle pull to refresh
   */
  handleRefresh(event: RefresherCustomEvent): void {
    this.loadAllData();

    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  /**
   * Navigate to create page
   */
  navigateToCreate(): void {
    this.router.navigate(['/admin/residents/new']);
  }

  /**
   * Navigate to detail page
   */
  navigateToView(item: Resident): void {
    this.router.navigate(['/admin/residents', item.id]);
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(item: Resident): void {
    this.router.navigate(['/admin/residents', item.id, 'edit']);
  }

  /**
   * Show delete confirmation
   */
  async confirmDelete(item: Resident): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete Resident',
      message: `Are you sure you want to delete "${item.firstName} ${item.lastName}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.handleDelete(item.id);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Handle delete
   */
  private handleDelete(id: string): void {
    this.loadingService.show({ message: 'Deleting resident...' });

    this.subscriptions.push(
      this.residentsService.delete(id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Resident deleted successfully');
          this.loadResidents(); // Reload list
          this.loadResidentStats(); // Reload stats
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Failed to delete resident');
          console.error('Delete resident error:', error);
        }
      })
    );
  }

  /**
   * Handle table action click
   */
  onAction(event: { action: TableAction; item: Resident }): void {
    if (event.action.handler) {
      event.action.handler(event.item);
    }
  }

  /**
   * Handle search/filter change
   */
  onFilterChange(filters: any[]): void {
    const searchFilter = filters.find((f) => f.column === 'search');
    if (searchFilter) {
      this.handleSearch(searchFilter.value);
    }
  }

  /**
   * Handle search
   */
  private handleSearch(query: string): void {
    if (!query || query.trim() === '') {
      this.loadResidents();
      return;
    }

    this.dataSource.loading = true;

    const params = {
      page: 1,
      limit: this.pageSize,
      search: query.trim()
    };

    this.subscriptions.push(
      this.residentsService.getAll(params).subscribe({
        next: (response) => {
          this.residents = response.data;
          this.dataSource = {
            data: response.data,
            loading: false,
            total: response.total,
            totalPages: response.totalPages
          };
          this.totalItems = response.total || 0;
          this.currentPage = 1;
        },
        error: (error) => {
          console.error('Error searching residents:', error);
          this.dataSource = {
            data: [],
            loading: false,
            total: 0,
            totalPages: 0
          };
        }
      })
    );
  }

  /**
   * Handle pagination change
   */
  onPageChange(page: number): void {
    console.log('on page change', page);
    this.currentPage = page;
    this.loadResidents();
  }

  /**
   * Get ownership type color for badges
   */
  getOwnershipTypeColor(type: OwnershipType): string {
    return OWNERSHIP_TYPE_COLORS[type] || 'medium';
  }

  /**
   * Format date for display
   */
  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  }

  /**
   * Get full name
   */
  getFullName(resident: Resident): string {
    return `${resident.firstName} ${resident.lastName}`;
  }

  /**
   * Check if stats are loaded
   */
  hasStats(): boolean {
    return this.residentStats !== null;
  }

  /**
   * Check if there are any residents
   */
  hasResidents(): boolean {
    return this.residents.length > 0;
  }

  /**
   * Navigate to dashboard
   */
  navigateToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
