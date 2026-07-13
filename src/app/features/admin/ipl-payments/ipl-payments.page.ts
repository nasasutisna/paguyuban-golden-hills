import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IonicModule, AlertController } from '@ionic/angular';
import { TableComponent } from '@shared/ui/table/table.component';
import { TableAction, TableConfig, TableDataSource } from '@shared/ui/table/table.model';
import { IplPaymentsService } from './ipl-payments.service';
import {
  IplPayment,
  IplPaymentStatus,
  IplPaymentMethod,
  IPL_PAYMENT_STATUS_LABELS,
  IPL_PAYMENT_STATUS_COLORS,
  IPL_PAYMENT_METHOD_LABELS,
  IplPaymentQueryParams
} from './ipl-payments.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';

/**
 * IPL Payments Page
 * Lists all IPL payments with filtering options
 * Used by coordinators (view block payments) and admins (view/approve all payments)
 */
@Component({
  selector: 'app-ipl-payments',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TableComponent],
  templateUrl: './ipl-payments.page.html',
  styleUrls: ['./ipl-payments.page.scss']
})
export class IplPaymentsPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private iplPaymentsService = inject(IplPaymentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  payments: IplPayment[] = [];
  currentPage = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;

  // Table data source
  dataSource: TableDataSource<IplPayment> = {
    data: [],
    loading: false
  };

  // Table configuration
  tableConfig!: TableConfig;

  // Status badges for table
  statusBadges = [
    { value: IplPaymentStatus.PENDING, label: 'Menunggu', color: 'warning', icon: 'time-outline' },
    { value: IplPaymentStatus.APPROVED, label: 'Disetujui', color: 'success', icon: 'checkmark-circle' },
    { value: IplPaymentStatus.REJECTED, label: 'Ditolak', color: 'danger', icon: 'close-circle' },
    { value: IplPaymentMethod.CASH, label: 'Tunai', color: 'medium' },
    { value: IplPaymentMethod.TRANSFER, label: 'Transfer', color: 'primary' },
    { value: IplPaymentMethod.E_WALLET, label: 'E-Wallet', color: 'tertiary' },
    { value: IplPaymentMethod.CARD, label: 'Kartu', color: 'secondary' }
  ];

  // Display labels
  readonly STATUS_LABELS = IPL_PAYMENT_STATUS_LABELS;
  readonly STATUS_COLORS = IPL_PAYMENT_STATUS_COLORS;
  readonly METHOD_LABELS = IPL_PAYMENT_METHOD_LABELS;
  readonly IplPaymentStatus = IplPaymentStatus;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Initialize table config here to ensure proper binding
    this.tableConfig = {
      columns: [
        { key: 'paymentNumber', header: 'No. Pembayaran', type: 'text', sortable: true },
        { key: 'residentName', header: 'Warga', type: 'text' },
        { key: 'unitNumber', header: 'Unit', type: 'text' },
        { key: 'periodName', header: 'Periode', type: 'text' },
        { key: 'paymentDate', header: 'Tanggal Bayar', type: 'date', sortable: true },
        { key: 'paymentMethod', header: 'Metode', type: 'text' },
        { key: 'calculatedAmount', header: 'Total IPL', type: 'currency', align: 'right' },
        { key: 'status', header: 'Status', type: 'status', sortable: true }
      ],
      actions: [
        {
          id: 'view',
          label: 'Lihat',
          icon: 'eye-outline',
          color: 'medium',
          handler: (item) => this.navigateToDetail(item.id)
        },
        {
          id: 'approve',
          label: 'Setujui',
          icon: 'checkmark-outline',
          color: 'success',
          show: (item: any) => {
            console.log('show approve called for:', item?.paymentNumber, 'status:', item?.status);
            console.log('canAApprove:',this.canApprove(item));
            return this.canApprove(item);
          },
          handler: (item) => this.quickApprove(item)
        },
        {
          id: 'reject',
          label: 'Tolak',
          icon: 'close-outline',
          color: 'danger',
          show: (item: any) => {
            console.log('show reject called for:', item?.paymentNumber, 'status:', item?.status);
            return this.canReject(item);
          },
          handler: (item) => this.quickReject(item)
        }
      ],
      sortable: false,
      filterable: true,
      pagination: true,
      pageSize: this.pageSize,
      pageSizeOptions: [10, 25, 50],
      showHeader: true,
      striped: true,
      hoverable: true,
      emptyMessage: 'Belum ada pembayaran IPL',
      loadingMessage: 'Memuat data...'
    };

    this.loadPayments();
  }

  /**
   * Load payments with current filters
   */
  loadPayments(): void {
    this.dataSource.loading = true;

    const params: IplPaymentQueryParams = {
      page: this.currentPage,
      limit: this.pageSize
    };

    this.subscriptions.push(
      this.iplPaymentsService.getAll(params).subscribe({
        next: (response) => {
          this.payments = response.data;
          const transformedData = this.transformDataWithResidentInfo(response.data);
          this.dataSource = {
            data: transformedData,
            loading: false,
            total: response.total,
            totalPages: response.totalPages
          };
          this.total = response.total || 0;
          this.totalPages = response.totalPages || 0;
        },
        error: (error) => {
          this.toastService.error('Gagal memuat pembayaran IPL');
          this.dataSource = {
            data: [],
            loading: false,
            total: 0
          };
          console.error('Error loading payments:', error);
        }
      })
    );
  }

  /**
   * Transform payments data to include resident info
   */
  private transformDataWithResidentInfo(payments: IplPayment[]): any[] {
    return payments.map(payment => ({
      ...payment,
      residentName: this.getResidentName(payment),
      unitNumber: payment.houseUnit?.unitNumber || '-',
      periodName: this.getPeriodName(payment)
    }));
  }

  /**
   * Navigate to create page
   */
  navigateToCreate(): void {
    this.router.navigate(['/admin/ipl-payments/new']);
  }

  /**
   * Navigate to create bulk payment page
   */
  navigateToCreateBulk(): void {
    this.router.navigate(['/admin/ipl-payments/bulk/new']);
  }

  /**
   * Navigate to detail page
   */
  navigateToDetail(id: string): void {
    this.router.navigate(['/admin/ipl-payments', id]);
  }

  /**
   * Navigate to pending approvals (admin only)
   */
  navigateToPending(): void {
    // For now, just reload with all payments
    // Could add filter for pending status in the future
    this.currentPage = 1;
    this.loadPayments();
  }

  /**
   * Handle table action click
   */
  onAction(event: { action: TableAction; item: IplPayment }): void {
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
      this.currentPage = 1;
      this.loadPayments();
      return;
    }

    this.dataSource.loading = true;

    const params: IplPaymentQueryParams = {
      page: 1,
      limit: this.pageSize,
      search: query.trim()
    };

    this.subscriptions.push(
      this.iplPaymentsService.getAll(params).subscribe({
        next: (response) => {
          this.payments = response.data;
          const transformedData = this.transformDataWithResidentInfo(response.data);
          this.dataSource = {
            data: transformedData,
            loading: false,
            total: response.total,
            totalPages: response.totalPages
          };
          this.total = response.total || 0;
          this.totalPages = response.totalPages || 0;
          this.currentPage = 1;
        },
        error: (error) => {
          console.error('Error searching payments:', error);
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
    this.loadPayments();
  }

  /**
   * Quick approve payment
   */
  async quickApprove(payment: IplPayment): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Setujui Pembayaran',
      message: `Setujui pembayaran ${payment.paymentNumber} dari ${this.getResidentName(payment)}?`,
      inputs: [
        {
          name: 'comments',
          type: 'textarea',
          placeholder: 'Catatan (opsional)'
        }
      ],
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Setujui',
          handler: (data) => {
            this.handleApprove(payment.id, data.comments || '');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Quick reject payment
   */
  async quickReject(payment: IplPayment): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Tolak Pembayaran',
      message: `Tolak pembayaran ${payment.paymentNumber} dari ${this.getResidentName(payment)}?`,
      inputs: [
        {
          name: 'rejectionReason',
          type: 'textarea',
          placeholder: 'Alasan penolakan',
          value: ''
        }
      ],
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Tolak',
          role: 'destructive',
          handler: (data) => {
            if (!data.rejectionReason || data.rejectionReason.trim() === '') {
              this.toastService.error('Alasan penolakan wajib diisi');
              return false;
            }
            this.handleReject(payment.id, data.rejectionReason);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Handle approve action
   */
  private handleApprove(id: string, comments: string): void {
    this.loadingService.show({ message: 'Memproses persetujuan...' });

    this.subscriptions.push(
      this.iplPaymentsService.approve(id, { comments }).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Pembayaran disetujui');
          this.loadPayments();
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menyetujui pembayaran');
          console.error('Approve error:', error);
        }
      })
    );
  }

  /**
   * Handle reject action
   */
  private handleReject(id: string, rejectionReason: string): void {
    this.loadingService.show({ message: 'Memproses penolakan...' });

    this.subscriptions.push(
      this.iplPaymentsService.reject(id, { rejectionReason }).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Pembayaran ditolak');
          this.loadPayments();
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menolak pembayaran');
          console.error('Reject error:', error);
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
   * Get status color
   */
  getStatusColor(status: IplPaymentStatus): string {
    return this.STATUS_COLORS[status] || 'medium';
  }

  /**
   * Get resident name
   */
  getResidentName(payment: IplPayment): string {
    if (!payment.resident) return '-';
    return `${payment.resident.firstName} ${payment.resident.lastName}`;
  }

  /**
   * Get resident address
   */
  getResidentAddress(payment: IplPayment): string {
    if (!payment.resident) return '-';
    const block = payment.resident.houseBlock;
    const blockName = block ? block.blockName : '-';
    return `${blockName} - ${payment.resident.unitNumber}`;
  }

  /**
   * Get period name
   */
  getPeriodName(payment: IplPayment): string {
    if (!payment.period) return '-';
    return payment.period.periodName;
  }

  /**
   * Get payment method label
   */
  getPaymentMethodLabel(payment: IplPayment): string {
    return this.METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod;
  }

  /**
   * Get pending count
   */
  get pendingCount(): number {
    return this.payments.filter(p => p.status === IplPaymentStatus.PENDING).length;
  }

  /**
   * Get approved count
   */
  get approvedCount(): number {
    return this.payments.filter(p => p.status === IplPaymentStatus.APPROVED).length;
  }

  /**
   * Check if can approve (is pending status)
   */
  canApprove(payment: any): boolean {
    const status = payment?.status;
    return status === IplPaymentStatus.PENDING || status === 'PENDING';
  }

  /**
   * Check if can reject (is pending status)
   */
  canReject(payment: any): boolean {
    const status = payment?.status;
    return status === IplPaymentStatus.PENDING || status === 'PENDING';
  }

  /**
   * Check if payment is overdue (past due date of period)
   */
  isOverdue(payment: IplPayment): boolean {
    if (!payment.period?.dueDate) return false;
    if (payment.status === IplPaymentStatus.APPROVED || payment.status === IplPaymentStatus.REJECTED) {
      return false;
    }
    const today = new Date();
    const dueDate = new Date(payment.period.dueDate);
    return dueDate < today;
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
