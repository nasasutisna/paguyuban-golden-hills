import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IonicModule, AlertController } from '@ionic/angular';
import { TableComponent } from '@shared/ui/table/table.component';
import { TableAction, TableConfig, TableDataSource } from '@shared/ui/table/table.model';
import { IplPeriodsService } from './ipl-periods.service';
import {
  IplPeriod,
  IplPeriodStatus,
  IPL_PERIOD_STATUS_LABELS,
  IplPeriodWithStats,
  IplPeriodQueryParams
} from './ipl-payments.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';

/**
 * IPL Periods Page
 * Admin page to manage IPL periods (months)
 */
@Component({
  selector: 'app-ipl-periods',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TableComponent],
  templateUrl: './ipl-periods.page.html',
  styleUrl: './ipl-periods.page.scss'
})
export class IplPeriodsPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private iplPeriodsService = inject(IplPeriodsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  periods: IplPeriodWithStats[] = [];
  currentPage = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;

  // Table data source
  dataSource: TableDataSource<IplPeriodWithStats> = {
    data: [],
    loading: false
  };

  // Table configuration
  tableConfig!: TableConfig;

  // Status badges for table
  statusBadges = [
    { value: IplPeriodStatus.ACTIVE, label: IPL_PERIOD_STATUS_LABELS[IplPeriodStatus.ACTIVE], color: 'success', icon: 'checkmark-circle' },
    { value: IplPeriodStatus.CLOSED, label: IPL_PERIOD_STATUS_LABELS[IplPeriodStatus.CLOSED], color: 'medium', icon: 'lock-closed' },
    { value: IplPeriodStatus.DRAFT, label: IPL_PERIOD_STATUS_LABELS[IplPeriodStatus.DRAFT], color: 'warning', icon: 'document' }
  ];

  // Display labels
  readonly STATUS_LABELS = IPL_PERIOD_STATUS_LABELS;
  readonly IplPeriodStatus = IplPeriodStatus;

  // Year options for filter
  get yearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear + 1];
  }

  // Status filter options
  readonly statusOptions = [
    { value: '', label: 'Semua Status' },
    { value: IplPeriodStatus.ACTIVE, label: IPL_PERIOD_STATUS_LABELS[IplPeriodStatus.ACTIVE] },
    { value: IplPeriodStatus.CLOSED, label: IPL_PERIOD_STATUS_LABELS[IplPeriodStatus.CLOSED] },
    { value: IplPeriodStatus.DRAFT, label: IPL_PERIOD_STATUS_LABELS[IplPeriodStatus.DRAFT] }
  ];

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Initialize table config
    this.tableConfig = {
      columns: [
        { key: 'periodName', header: 'Nama Periode', type: 'text', sortable: true },
        { key: 'periodCode', header: 'Kode', type: 'text' },
        { key: 'periodDisplay', header: 'Periode', type: 'text' },
        { key: 'baseRate', header: 'Base Rate', type: 'currency', align: 'right' },
        { key: 'dueDate', header: 'Jatuh Tempo', type: 'date' },
        { key: 'paymentCount', header: 'Jml Pembayaran', type: 'number', align: 'right' },
        { key: 'totalAmount', header: 'Total Nilai', type: 'currency', align: 'right' },
        { key: 'status', header: 'Status', type: 'status', sortable: true }
      ],
      actions: [
        {
          id: 'viewPayments',
          label: 'Lihat Pembayaran',
          icon: 'list-outline',
          color: 'primary',
          handler: (item) => this.navigateToPayments(item.id)
        },
        {
          id: 'edit',
          label: 'Edit',
          icon: 'create-outline',
          color: 'medium',
          handler: (item) => this.navigateToEdit(item.id)
        },
        {
          id: 'close',
          label: 'Tutup',
          icon: 'lock-closed-outline',
          color: 'warning',
          show: (item: any) => this.canClose(item),
          handler: (item) => this.closePeriod(item)
        },
        {
          id: 'reopen',
          label: 'Buka',
          icon: 'lock-open-outline',
          color: 'success',
          show: (item: any) => this.canReopen(item),
          handler: (item) => this.reopenPeriod(item)
        },
        {
          id: 'delete',
          label: 'Hapus',
          icon: 'trash-outline',
          color: 'danger',
          show: (item: any) => this.canDelete(item),
          handler: (item) => this.confirmDelete(item)
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
      emptyMessage: 'Belum ada periode IPL',
      loadingMessage: 'Memuat data...'
    };

    this.loadPeriods();
  }

  /**
   * Load periods with filters
   */
  loadPeriods(): void {
    this.dataSource.loading = true;

    const params: IplPeriodQueryParams = {
      page: this.currentPage,
      limit: this.pageSize
    };

    this.subscriptions.push(
      this.iplPeriodsService.getWithStats(params).subscribe({
        next: (data) => {
          const transformedData = this.transformDataWithDisplay(data);
          this.periods = transformedData;
          this.dataSource = {
            data: transformedData,
            loading: false,
            total: data.length,
            totalPages: 1
          };
          this.total = data.length || 0;
          this.totalPages = 1;
        },
        error: (error) => {
          this.toastService.error('Gagal memuat periode IPL');
          this.dataSource = {
            data: [],
            loading: false,
            total: 0
          };
          console.error('Error loading periods:', error);
        }
      })
    );
  }

  /**
   * Transform periods data to include display fields
   */
  private transformDataWithDisplay(periods: IplPeriodWithStats[]): IplPeriodWithStats[] {
    return periods.map(period => ({
      ...period,
      periodDisplay: `${this.getMonthName(period.month)} ${period.year}`
    }));
  }

  /**
   * Navigate to create page
   */
  navigateToCreate(): void {
    this.router.navigate(['/admin/ipl-periods/new']);
  }

  /**
   * Navigate to payments for this period
   */
  navigateToPayments(periodId: string): void {
    this.router.navigate(['/admin/ipl-payments'], { queryParams: { periodId } });
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(id: string): void {
    this.router.navigate(['/admin/ipl-periods', id, 'edit']);
  }

  /**
   * Handle table action click
   */
  onAction(event: { action: TableAction; item: IplPeriodWithStats }): void {
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
    // For now, just filter locally since we're getting all data
    // In production, this should call the API with search params
    if (!query || query.trim() === '') {
      this.loadPeriods();
      return;
    }

    const searchLower = query.toLowerCase();
    const filtered = this.periods.filter(period =>
      period.periodName.toLowerCase().includes(searchLower) ||
      period.periodCode.toLowerCase().includes(searchLower) ||
      `${this.getMonthName(period.month)} ${period.year}`.toLowerCase().includes(searchLower)
    );

    this.dataSource = {
      data: filtered,
      loading: false,
      total: filtered.length,
      totalPages: 1
    };
  }

  /**
   * Handle pagination change
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadPeriods();
  }

  /**
   * Close period
   */
  async closePeriod(period: IplPeriod): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Tutup Periode',
      message: `Tutup periode "${period.periodName}"? Tidak ada pembayaran baru yang dapat diinput setelah periode ditutup.`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Tutup',
          role: 'destructive',
          handler: () => {
            this.handleClosePeriod(period.id);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Reopen period
   */
  async reopenPeriod(period: IplPeriod): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Buka Kembali Periode',
      message: `Buka kembali periode "${period.periodName}"? Pembayaran baru dapat diinput setelah periode dibuka.`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Buka',
          handler: () => {
            this.handleReopenPeriod(period.id);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Delete period
   */
  async confirmDelete(period: IplPeriodWithStats): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Hapus Periode',
      message: `Apakah Anda yakin ingin menghapus periode "${period.periodName}"? Semua pembayaran terkait juga akan dihapus.`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: () => {
            this.handleDelete(period.id);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Handle close period
   */
  private handleClosePeriod(id: string): void {
    this.loadingService.show({ message: 'Menutup periode...' });

    this.subscriptions.push(
      this.iplPeriodsService.closePeriod(id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Periode berhasil ditutup');
          this.loadPeriods();
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menutup periode');
          console.error('Close period error:', error);
        }
      })
    );
  }

  /**
   * Handle reopen period
   */
  private handleReopenPeriod(id: string): void {
    this.loadingService.show({ message: 'Membuka kembali periode...' });

    this.subscriptions.push(
      this.iplPeriodsService.reopenPeriod(id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Periode berhasil dibuka kembali');
          this.loadPeriods();
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal membuka kembali periode');
          console.error('Reopen period error:', error);
        }
      })
    );
  }

  /**
   * Handle delete
   */
  private handleDelete(id: string): void {
    this.loadingService.show({ message: 'Menghapus periode...' });

    this.subscriptions.push(
      this.iplPeriodsService.delete(id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Periode berhasil dihapus');
          this.loadPeriods();
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus periode');
          console.error('Delete period error:', error);
        }
      })
    );
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Get month name
   */
  getMonthName(month: number): string {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month - 1] || '-';
  }

  /**
   * Check if period can be closed (is active)
   */
  canClose(period: IplPeriod): boolean {
    return period.status === IplPeriodStatus.ACTIVE;
  }

  /**
   * Check if period can be reopened (is closed)
   */
  canReopen(period: IplPeriod): boolean {
    return period.status === IplPeriodStatus.CLOSED;
  }

  /**
   * Check if period can be deleted (is draft or has no payments)
   */
  canDelete(period: IplPeriodWithStats): boolean {
    return period.status === IplPeriodStatus.DRAFT || (period.paymentCount || 0) === 0;
  }

  /**
   * Get active count
   */
  get activeCount(): number {
    return this.periods.filter(p => p.status === IplPeriodStatus.ACTIVE).length;
  }

  /**
   * Get closed count
   */
  get closedCount(): number {
    return this.periods.filter(p => p.status === IplPeriodStatus.CLOSED).length;
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
