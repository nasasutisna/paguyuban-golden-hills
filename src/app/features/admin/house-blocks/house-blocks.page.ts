import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AlertController, IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { TableComponent } from '@shared/ui/table/table.component';
import { TableAction, TableConfig, TableDataSource } from '@shared/ui/table/table.model';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BLOCK_TYPE_COLORS, BlockType, HouseBlock, OccupancyStats } from './house-blocks.model';
import { HouseBlocksService } from './house-blocks.service';

/**
 * House Blocks List Page
 * Displays statistics cards and table of house blocks with CRUD operations
 */
@Component({
  selector: 'app-house-blocks',
  standalone: true,
  imports: [CommonModule, IonicModule, TableComponent],
  templateUrl: './house-blocks.page.html',
  styleUrls: ['./house-blocks.page.scss']
})
export class HouseBlocksPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private houseBlocksService = inject(HouseBlocksService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  // Data
  houseBlocks: HouseBlock[] = [];
  occupancyStats: OccupancyStats | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 2;
  totalItems = 0;

  // Loading states
  loading = true;
  statsLoading = true;

  // Table configuration
  tableConfig: TableConfig = {
    columns: [
      { key: 'blockCode', header: 'Kode', type: 'text', sortable: true },
      { key: 'blockName', header: 'Nama', type: 'text', sortable: true },
      { key: 'blockType', header: 'Tipe', type: 'status', sortable: true },
      { key: 'totalUnits', header: 'Unit', type: 'number', sortable: true, align: 'right' },
      { key: 'totalFloors', header: 'Lantai', type: 'number', sortable: true, align: 'right' },
      { key: 'coordinatorName', header: 'Koordinator', type: 'text' },
      { key: 'address', header: 'Alamat', type: 'text' },
      { key: 'isActive', header: 'Status', type: 'status', sortable: true },
      { key: 'createdAt', header: 'Dibuat', type: 'date', sortable: true }
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
          title: 'Hapus Blok',
          message: 'Apakah Anda yakin ingin menghapus blok ini? Tindakan ini tidak dapat dibatalkan.',
          confirmText: 'Hapus',
          cancelText: 'Batal'
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
    emptyMessage: 'Tidak ada blok ditemukan',
    loadingMessage: 'Memuat blok...'
  };

  // Table data source
  dataSource: TableDataSource<HouseBlock> = {
    data: [],
    loading: false
  };

  // Status badges for table
  statusBadges = [
    { value: true, label: 'Aktif', color: 'success', icon: 'checkmark-circle' },
    { value: false, label: 'Tidak Aktif', color: 'medium', icon: 'close-circle' },
    { value: BlockType.RESIDENTIAL, label: 'Residensial', color: 'success' },
    { value: BlockType.COMMERCIAL, label: 'Komersial', color: 'warning' },
    { value: BlockType.MIXED, label: 'Campuran', color: 'tertiary' }
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
        // Reload data when navigating to the house-blocks page
        if (event.url === '/admin/house-blocks' || event.urlAfterRedirects === '/admin/house-blocks') {
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
    this.loadHouseBlocks();
  }

  /**
   * Load occupancy statistics
   */
  private loadOccupancyStats(): void {
    this.statsLoading = true;

    this.subscriptions.push(
      this.houseBlocksService.getOccupancyStats().subscribe({
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
   * Load house blocks list
   */
  loadHouseBlocks(): void {
    this.dataSource.loading = true;

    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const
    };

    this.subscriptions.push(
      this.houseBlocksService.getAll(params).subscribe({
        next: (response) => {
          console.log('resoonse',response)
          this.houseBlocks = response.data;
          const transformedData = this.transformDataWithCoordinator(response.data);
          this.dataSource = {
            data: transformedData,
            loading: false,
            total: response.total,
            totalPages: response.totalPages
          };
          this.totalItems = response.total || 0;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading house blocks:', error);
          this.toastService.error('Gagal memuat blok');
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
    this.router.navigate(['/admin/house-blocks/new']);
  }

  /**
   * Navigate to detail page
   */
  navigateToView(item: HouseBlock): void {
    this.router.navigate(['/admin/house-blocks', item.id]);
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(item: HouseBlock): void {
    this.router.navigate(['/admin/house-blocks', item.id, 'edit']);
  }

  /**
   * Show delete confirmation
   */
  async confirmDelete(item: HouseBlock): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Hapus Blok',
      message: `Apakah Anda yakin ingin menghapus "${item.blockName}"? Tindakan ini tidak dapat dibatalkan.`,
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
    this.loadingService.show({ message: 'Menghapus blok...' });

    this.subscriptions.push(
      this.houseBlocksService.delete(id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Blok berhasil dihapus');
          this.loadHouseBlocks(); // Reload list
          this.loadOccupancyStats(); // Reload stats
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus blok');
          console.error('Delete house block error:', error);
        }
      })
    );
  }

  /**
   * Handle table action click
   */
  onAction(event: { action: TableAction; item: HouseBlock }): void {
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
      this.loadHouseBlocks();
      return;
    }

    this.dataSource.loading = true;

    const params = {
      page: 1,
      limit: this.pageSize,
      search: query.trim()
    };

    this.subscriptions.push(
      this.houseBlocksService.getAll(params).subscribe({
        next: (response) => {
          this.houseBlocks = response.data;
          const transformedData = this.transformDataWithCoordinator(response.data);
          this.dataSource = {
            data: transformedData,
            loading: false,
            total: response.total,
            totalPages: response.totalPages
          };
          this.totalItems = response.total || 0;
          this.currentPage = 1;
        },
        error: (error) => {
          console.error('Error searching house blocks:', error);
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
   * Transform house blocks data to include coordinator name
   */
  private transformDataWithCoordinator(blocks: HouseBlock[]): any[] {
    return blocks.map(block => ({
      ...block,
      coordinatorName: this.getCoordinatorName(block)
    }));
  }

  /**
   * Get coordinator name from house block
   */
  getCoordinatorName(block: HouseBlock): string {
    if (!block.coordinator) return '-';
    const { firstName, lastName } = block.coordinator;
    return `${firstName} ${lastName}`.trim();
  }

  /**
   * Handle pagination change
   */
  onPageChange(page: number): void {
    console.log('on page change',page );
    this.currentPage = page;
    this.loadHouseBlocks();
  }

  /**
   * Get block type color for badges
   */
  getBlockTypeColor(type: BlockType): string {
    return BLOCK_TYPE_COLORS[type] || 'medium';
  }

  /**
   * Format area value with m² unit
   */
  formatArea(area?: number): string {
    if (!area) return '-';
    return `${area.toLocaleString()} m²`;
  }

  /**
   * Format percentage for occupancy rate
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Check if stats are loaded
   */
  hasStats(): boolean {
    return this.occupancyStats !== null;
  }

  /**
   * Check if there are any house blocks
   */
  hasBlocks(): boolean {
    return this.houseBlocks.length > 0;
  }

  /**
   * Navigate to dashboard
   */
  navigateToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
