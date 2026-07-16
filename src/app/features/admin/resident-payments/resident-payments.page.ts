import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TableComponent } from '@shared/ui/table/table.component';
import { TableAction, TableConfig, TableDataSource } from '@shared/ui/table/table.model';
import { ResidentPaymentsService } from './resident-payments.service';
import {
  ResidentPayment,
  PaymentMethod,
  PaymentStatus,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_COLORS,
  PAYMENT_STATUS_COLORS,
  ResidentPaymentQueryParams
} from './resident-payments.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';

/**
 * Resident Payments Page
 * Lists all resident payments (pembayaran warga) in a table view
 */
@Component({
  selector: 'app-resident-payments',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TableComponent],
  templateUrl: './resident-payments.page.html',
  styleUrls: ['./resident-payments.page.scss']
})
export class ResidentPaymentsPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private residentPaymentsService = inject(ResidentPaymentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  payments: ResidentPayment[] = [];
  currentPage = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;

  // Table data source
  dataSource: TableDataSource<ResidentPayment> = {
    data: [],
    loading: false
  };

  // Table configuration
  tableConfig!: TableConfig;

  // Status badges for table
  statusBadges = [
    { value: PaymentStatus.PENDING, label: 'Menunggu', color: 'warning', icon: 'time-outline' },
    { value: PaymentStatus.COMPLETED, label: 'Selesai', color: 'success', icon: 'checkmark-circle' },
    { value: PaymentStatus.FAILED, label: 'Gagal', color: 'danger', icon: 'close-circle' },
    { value: PaymentStatus.CANCELLED, label: 'Dibatalkan', color: 'medium' },
    { value: PaymentMethod.CASH, label: 'Tunai', color: 'success' },
    { value: PaymentMethod.TRANSFER, label: 'Transfer', color: 'primary' },
    { value: PaymentMethod.CARD, label: 'Kartu', color: 'tertiary' },
    { value: PaymentMethod.E_WALLET, label: 'E-Wallet', color: 'warning' }
  ];

  // Display labels
  readonly PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;
  readonly PAYMENT_STATUS_LABELS = PAYMENT_STATUS_LABELS;
  readonly PAYMENT_METHOD_COLORS = PAYMENT_METHOD_COLORS;
  readonly PAYMENT_STATUS_COLORS = PAYMENT_STATUS_COLORS;
  readonly PaymentStatus = PaymentStatus;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Initialize table config here to ensure proper binding
    this.tableConfig = {
      columns: [
        { key: 'paymentNumber', header: 'No. Pembayaran', type: 'text', sortable: true },
        { key: 'residentName', header: 'Warga', type: 'text' },
        { key: 'unitNumber', header: 'Unit', type: 'text' },
        { key: 'invoiceNumber', header: 'Tagihan', type: 'text' },
        { key: 'paymentDate', header: 'Tanggal Bayar', type: 'date', sortable: true },
        { key: 'paymentMethod', header: 'Metode', type: 'text' },
        { key: 'amount', header: 'Jumlah', type: 'currency', align: 'right' },
        { key: 'status', header: 'Status', type: 'status', sortable: true }
      ],
      actions: [
        {
          id: 'view',
          label: 'Lihat',
          icon: 'eye-outline',
          color: 'medium',
          handler: (item) => this.navigateToDetail(item.id)
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
      emptyMessage: 'Belum ada pembayaran warga',
      loadingMessage: 'Memuat data...'
    };

    this.loadPayments();
  }

  /**
   * Load payments with current filters
   */
  loadPayments(): void {
    this.dataSource.loading = true;

    const params: ResidentPaymentQueryParams = {
      page: this.currentPage,
      limit: this.pageSize
    };

    this.subscriptions.push(
      this.residentPaymentsService.getAll(params).subscribe({
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
          this.toastService.error('Gagal memuat pembayaran');
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
   * Transform payments data to include resident info for table display
   */
  private transformDataWithResidentInfo(payments: ResidentPayment[]): any[] {
    return payments.map(payment => ({
      ...payment,
      residentName: this.getResidentName(payment),
      unitNumber: payment.resident?.unitNumber || '-',
      invoiceNumber: this.getInvoiceNumber(payment)
    }));
  }

  /**
   * Navigate to create page
   */
  navigateToCreate(invoiceId?: string): void {
    if (invoiceId) {
      this.router.navigate(['/admin/resident-payments/new'], {
        queryParams: { invoiceId }
      });
    } else {
      this.router.navigate(['/admin/resident-payments/new']);
    }
  }

  /**
   * Navigate to detail page
   */
  navigateToDetail(id: string): void {
    this.router.navigate(['/admin/resident-payments', id]);
  }

  /**
   * Handle table action click
   */
  onAction(event: { action: TableAction; item: ResidentPayment }): void {
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
    this.dataSource.loading = true;

    const params: ResidentPaymentQueryParams = {
      page: 1,
      limit: this.pageSize,
      search: query?.trim() || undefined
    };

    this.subscriptions.push(
      this.residentPaymentsService.getAll(params).subscribe({
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
   * Get completed payments count
   */
  get completedCount(): number {
    return this.payments.filter(p => p.status === PaymentStatus.COMPLETED).length;
  }

  /**
   * Get resident name
   */
  getResidentName(payment: ResidentPayment): string {
    if (!payment.resident) return '-';
    return `${payment.resident.firstName} ${payment.resident.lastName}`;
  }

  /**
   * Get invoice number
   */
  getInvoiceNumber(payment: ResidentPayment): string {
    if (!payment.invoice) return '-';
    return payment.invoice.invoiceNumber;
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
