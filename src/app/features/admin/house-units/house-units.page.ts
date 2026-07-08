import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HouseUnitsService } from './house-units.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { AlertController } from '@ionic/angular';
import { HouseUnit, HouseUnitOccupancyStats, OccupancyStatus, OCCUPANCY_STATUS_COLORS } from './house-units.model';
import { TableConfig, TableAction, TableDataSource } from '@shared/ui/table/table.model';
import { TableComponent } from '@shared/ui/table/table.component';

/**
 * House Units List Page
 * Displays statistics cards and table of house units with CRUD operations
 */
@Component({
  selector: 'app-house-units',
  standalone: true,
  imports: [CommonModule, IonicModule, TableComponent],
  templateUrl: './house-units.page.html',
  styleUrls: ['./house-units.page.scss']
})
export class HouseUnitsPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private houseUnitsService = inject(HouseUnitsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  // Data
  houseUnits: HouseUnit[] = [];
  occupancyStats: HouseUnitOccupancyStats | null = null;

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
      { key: 'unitCode', header: 'Kode Unit', type: 'text', sortable: true },
      { key: 'unitNumber', header: 'Nomor', type: 'text', sortable: true },
      { key: 'houseBlock.blockName', header: 'Blok', type: 'text', sortable: false },
      { key: 'unitType', header: 'Tipe', type: 'text', sortable: true },
      { key: 'landArea', header: 'LT (m²)', type: 'number', sortable: true, align: 'right' },
      { key: 'buildingArea', header: 'LB (m²)', type: 'number', sortable: true, align: 'right' },
      { key: 'occupancyStatus', header: 'Status Huni', type: 'status', sortable: true },
      { key: 'iplPercentage', header: 'IPL %', type: 'number', sortable: true, align: 'right' },
      { key: 'isBankBuyback', header: 'Bank Buyback', type: 'status', sortable: true },
      { key: 'isActive', header: 'Status', type: 'status', sortable: true }
    ],
    actions: [
      {
        id: 'view',
        label: 'Lihat',
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
        label: 'Hapus',
        icon: 'trash-outline',
        color: 'danger',
        handler: (item) => this.confirmDelete(item),
        confirm: {
          title: 'Hapus Unit',
          message: 'Apakah Anda yakin ingin menghapus unit ini? Tindakan ini tidak dapat dibatalkan.',
          confirmText: 'Hapus',
          cancelText: 'Batal'
        }
      }
    ],
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: this.pageSize,
    pageSizeOptions: [10, 25, 50],
    showHeader: true,
    showFooter: true,
    striped: true,
    hoverable: true,
    emptyMessage: 'Tidak ada unit ditemukan',
    loadingMessage: 'Memuat unit...'
  };

  // Table data source
  dataSource: TableDataSource<HouseUnit> = {
    data: [],
    loading: false
  };

  // Status badges for table
  statusBadges = [
    { value: true, label: 'Aktif', color: 'success', icon: 'checkmark-circle' },
    { value: false, label: 'Tidak Aktif', color: 'medium', icon: 'close-circle' },
    { value: OccupancyStatus.FULLY_OCCUPIED, label: 'Penuh', color: 'success' },
    { value: OccupancyStatus.OCCASIONALLY, label: 'Jarang', color: 'warning' },
    { value: OccupancyStatus.VACANT, label: 'Kosong', color: 'danger' },
    { value: OccupancyStatus.RENTED, label: 'Sewa', color: 'tertiary' }
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
        // Reload data when navigating to the house-units page
        if (event.url === '/admin/house-units' || event.urlAfterRedirects === '/admin/house-units') {
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
    this.loadOccupancyStats();
    this.loadHouseUnits();
  }

  /**
   * Load occupancy statistics
   */
  private loadOccupancyStats(): void {
    this.statsLoading = true;

    this.subscriptions.push(
      this.houseUnitsService.getOccupancyStats().subscribe({
        next: (stats) => {
          this.occupancyStats = stats;
          this.statsLoading = false;
        },
        error: (error) => {
          console.error('Error loading occupancy stats:', error);
          this.statsLoading = false;
        }
      })
    );
  }

  /**
   * Load house units list
   */
  loadHouseUnits(): void {
    this.dataSource.loading = true;

    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      sortBy: 'unitCode',
      sortOrder: 'asc' as const
    };

    this.subscriptions.push(
      this.houseUnitsService.getAll(params).subscribe({
        next: (response) => {
          this.houseUnits = response.data;
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
          console.error('Error loading house units:', error);
          this.toastService.error('Gagal memuat unit');
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
    this.router.navigate(['/admin/house-units/new']);
  }

  /**
   * Navigate to detail page
   */
  navigateToView(item: HouseUnit): void {
    this.router.navigate(['/admin/house-units', item.id]);
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(item: HouseUnit): void {
    this.router.navigate(['/admin/house-units', item.id, 'edit']);
  }

  /**
   * Show delete confirmation
   */
  async confirmDelete(item: HouseUnit): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Hapus Unit',
      message: `Apakah Anda yakin ingin menghapus "${item.unitCode}"? Tindakan ini tidak dapat dibatalkan.`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Hapus',
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
    this.loadingService.show({ message: 'Menghapus unit...' });

    this.subscriptions.push(
      this.houseUnitsService.delete(id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Unit berhasil dihapus');
          this.loadHouseUnits(); // Reload list
          this.loadOccupancyStats(); // Reload stats
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus unit');
          console.error('Delete house unit error:', error);
        }
      })
    );
  }

  /**
   * Handle table action click
   */
  onAction(event: { action: TableAction; item: HouseUnit }): void {
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
      this.loadHouseUnits();
      return;
    }

    this.dataSource.loading = true;

    const params = {
      page: 1,
      limit: this.pageSize,
      search: query.trim()
    };

    this.subscriptions.push(
      this.houseUnitsService.getAll(params).subscribe({
        next: (response) => {
          this.houseUnits = response.data;
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
          console.error('Error searching house units:', error);
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
    this.currentPage = page;
    this.loadHouseUnits();
  }

  /**
   * Get occupancy status color for badges
   */
  getOccupancyStatusColor(status: OccupancyStatus): string {
    return OCCUPANCY_STATUS_COLORS[status] || 'medium';
  }

  /**
   * Get occupancy status label in Indonesian
   */
  getOccupancyStatusLabel(status: OccupancyStatus): string {
    const labels: Record<OccupancyStatus, string> = {
      [OccupancyStatus.FULLY_OCCUPIED]: 'Ditinggali',
      [OccupancyStatus.OCCASIONALLY]: 'Jarang',
      [OccupancyStatus.VACANT]: 'Kosong',
      [OccupancyStatus.RENTED]: 'Disewa'
    };
    return labels[status] || status;
  }

  /**
   * Format area value with m² unit
   */
  formatArea(area?: number): string {
    if (!area) return '-';
    return `${area.toLocaleString('id-ID')} m²`;
  }

  /**
   * Format IPL percentage
   */
  formatIplPercentage(value: number): string {
    return `${value}%`;
  }

  /**
   * Check if stats are loaded
   */
  hasStats(): boolean {
    return this.occupancyStats !== null;
  }

  /**
   * Check if there are any house units
   */
  hasUnits(): boolean {
    return this.houseUnits.length > 0;
  }

  /**
   * Navigate to house blocks
   */
  navigateToHouseBlocks(): void {
    this.router.navigate(['/admin/house-blocks']);
  }

  /**
   * Navigate to dashboard
   */
  navigateToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
