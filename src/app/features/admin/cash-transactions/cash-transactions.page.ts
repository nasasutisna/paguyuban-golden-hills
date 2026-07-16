import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CashTransactionsService } from './cash-transactions.service';
import {
  CashTransaction,
  TransactionSummary,
  CashTransactionsResponse,
  TransactionType,
  PaymentMethod,
  ApprovalStatus,
  TRANSACTION_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  APPROVAL_STATUS_LABELS
} from './cash-transactions.model';

// Table component and types
import { TableComponent } from '@shared/ui/table/table.component';
import { TableConfig, TableDataSource } from '@shared/ui/table/table.model';

/**
 * Cash Transactions List Page
 * Displays list of cash transactions with filtering and statistics
 */
@Component({
  selector: 'app-cash-transactions',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    TableComponent
  ],
  templateUrl: './cash-transactions.page.html',
  styleUrls: ['./cash-transactions.page.scss']
})
export class CashTransactionsPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private cashTransactionsService = inject(CashTransactionsService);

  // Date filter state
  startDate: string | null = null;
  endDate: string | null = null;
  pendingStartDate: string | null = null;
  pendingEndDate: string | null = null;

  // Filter panel visibility (collapsed by default)
  showFilter = false;

  // Quick date presets
  datePresets: { key: string; label: string }[] = [
    { key: 'today', label: 'Hari Ini' },
    { key: '7d', label: '7 Hari' },
    { key: '30d', label: '30 Hari' },
    { key: 'thisMonth', label: 'Bulan Ini' },
    { key: 'lastMonth', label: 'Bulan Lalu' },
    { key: 'thisYear', label: 'Tahun Ini' }
  ];
  activePreset: string | null = null;

  // Data source for table
  dataSource: TableDataSource<CashTransaction> = {
    data: [],
    loading: false
  };

  // Summary data
  summary: TransactionSummary | null = null;
  statsLoading = true;

  // Table configuration
  tableConfig!: TableConfig;

  // Status badges for table
  statusBadges = [
    { value: TransactionType.INCOME, label: 'Pemasukan', color: 'success' },
    { value: TransactionType.EXPENSE, label: 'Pengeluaran', color: 'danger' },
    { value: ApprovalStatus.PENDING, label: 'Menunggu', color: 'warning' },
    { value: ApprovalStatus.APPROVED, label: 'Disetujui', color: 'success' },
    { value: ApprovalStatus.REJECTED, label: 'Ditolak', color: 'danger' },
    { value: PaymentMethod.CASH, label: 'Tunai', color: 'medium' },
    { value: PaymentMethod.TRANSFER, label: 'Transfer', color: 'primary' },
    { value: PaymentMethod.CARD, label: 'Kartu', color: 'secondary' }
  ];

  // Display labels
  readonly TRANSACTION_TYPE_LABELS = TRANSACTION_TYPE_LABELS;
  readonly PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;
  readonly APPROVAL_STATUS_LABELS = APPROVAL_STATUS_LABELS;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    console.log('[CashTransactionsPage] ngOnInit called');
    this.initializeTableConfig();
    console.log('[CashTransactionsPage] tableConfig:', this.tableConfig);
    this.loadSummary();
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Initialize table configuration
   */
  private initializeTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'transactionDate', header: 'Tanggal', type: 'date', sortable: true },
        { key: 'description', header: 'Deskripsi', type: 'text', sortable: true },
        { key: 'category.categoryName', header: 'Kategori', type: 'text' },
        { key: 'amount', header: 'Nominal', type: 'currency', sortable: true },
        { key: 'paymentMethod', header: 'Metode', type: 'status' },
        { key: 'approvalStatus', header: 'Status', type: 'status', sortable: true }
      ],
      actions: [
        {
          id: 'view',
          label: 'Lihat',
          icon: 'eye-outline',
          color: 'primary',
          handler: (item: CashTransaction) => this.navigateToDetail(item.id)
        },
        {
          id: 'edit',
          label: 'Edit',
          icon: 'create-outline',
          color: 'tertiary',
          show: (item: CashTransaction) => item.approvalStatus !== ApprovalStatus.APPROVED,
          handler: (item: CashTransaction) => this.navigateToEdit(item.id)
        },
        {
          id: 'approve',
          label: 'Setujui',
          icon: 'checkmark-circle-outline',
          color: 'success',
          show: (item: CashTransaction) => item.requiresApproval && item.approvalStatus === ApprovalStatus.PENDING,
          handler: (item: CashTransaction) => this.approveTransaction(item)
        },
        {
          id: 'reject',
          label: 'Tolak',
          icon: 'close-circle-outline',
          color: 'danger',
          show: (item: CashTransaction) => item.requiresApproval && item.approvalStatus === ApprovalStatus.PENDING,
          handler: (item: CashTransaction) => this.rejectTransaction(item)
        },
        {
          id: 'delete',
          label: 'Hapus',
          icon: 'trash-outline',
          color: 'danger',
          show: (item: CashTransaction) => item.approvalStatus !== ApprovalStatus.APPROVED,
          handler: (item: CashTransaction) => this.deleteTransaction(item)
        }
      ],
      pageSize: 10,
      sortable: true,
      pagination: true
    };
  }

  /**
   * Load transaction summary
   */
  private loadSummary(): void {
    this.statsLoading = true;

    this.subscriptions.push(
      this.cashTransactionsService.getSummary(this.startDate || undefined, this.endDate || undefined).subscribe({
        next: (summary) => {
          this.summary = summary;
          this.statsLoading = false;
        },
        error: (error) => {
          console.error('Error loading summary:', error);
          this.summary = null;
          this.statsLoading = false;
        }
      })
    );
  }

  /**
   * Load transactions
   */
  private loadTransactions(): void {
    console.log('[CashTransactionsPage] loadTransactions called');
    this.dataSource.loading = true;
    console.log('[CashTransactionsPage] dataSource set to loading:', this.dataSource);

    this.subscriptions.push(
      this.cashTransactionsService.getAll({
        page: 1,
        limit: 10,
        startDate: this.startDate || undefined,
        endDate: this.endDate || undefined
      }).subscribe({
        next: (response: CashTransactionsResponse) => {
          console.log('[CashTransactionsPage] Response received:', response);
          console.log('[CashTransactionsPage] Data length:', response?.data?.length);
          console.log('[CashTransactionsPage] First item:', response?.data?.[0]);

          // Create a new object to trigger ngOnChanges in table component
          this.dataSource = {
            data: response.data,
            total: response.total,
            totalPages: response.totalPages,
            loading: false
          };

          console.log('[CashTransactionsPage] dataSource after update:', this.dataSource);
          console.log('[CashTransactionsPage] dataSource.data:', this.dataSource.data);
          console.log('[CashTransactionsPage] dataSource.loading:', this.dataSource.loading);
        },
        error: (error) => {
          console.error('[CashTransactionsPage] Error loading transactions:', error);
          this.dataSource = {
            data: [],
            total: 0,
            totalPages: 0,
            loading: false
          };
        }
      })
    );
  }

  /**
   * Navigate to create page
   */
  navigateToCreate(): void {
    this.router.navigate(['/admin/cash-transactions/create']);
  }

  /**
   * Navigate to detail page
   */
  navigateToDetail(id: string): void {
    this.router.navigate(['/admin/cash-transactions', id]);
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(id: string): void {
    this.router.navigate(['/admin/cash-transactions', id, 'edit']);
  }

  /**
   * Approve transaction
   */
  private approveTransaction(transaction: CashTransaction): void {
    this.subscriptions.push(
      this.cashTransactionsService.approve(transaction.id).subscribe({
        next: () => {
          this.loadTransactions();
          this.loadSummary();
        },
        error: (error) => {
          console.error('Error approving transaction:', error);
        }
      })
    );
  }

  /**
   * Reject transaction
   */
  private rejectTransaction(transaction: CashTransaction): void {
    this.subscriptions.push(
      this.cashTransactionsService.reject(transaction.id).subscribe({
        next: () => {
          this.loadTransactions();
          this.loadSummary();
        },
        error: (error) => {
          console.error('Error rejecting transaction:', error);
        }
      })
    );
  }

  /**
   * Delete transaction
   */
  private deleteTransaction(transaction: CashTransaction): void {
    this.subscriptions.push(
      this.cashTransactionsService.delete(transaction.id).subscribe({
        next: () => {
          this.loadTransactions();
          this.loadSummary();
        },
        error: (error) => {
          console.error('Error deleting transaction:', error);
        }
      })
    );
  }

  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Get status color for badge
   */
  getStatusColor(status: ApprovalStatus): string {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return 'success';
      case ApprovalStatus.REJECTED:
        return 'danger';
      case ApprovalStatus.PENDING:
      default:
        return 'warning';
    }
  }

  /**
   * Check if stats data exists
   */
  hasStats(): boolean {
    return this.summary !== null || this.statsLoading;
  }

  /**
   * Toggle the date filter panel visibility
   */
  toggleFilter(): void {
    this.showFilter = !this.showFilter;
  }

  /**
   * Handle start date change
   */
  onStartDateChange(event: CustomEvent): void {
    this.pendingStartDate = event.detail.value;
    // Manual edit breaks any active preset match
    this.activePreset = null;
  }

  /**
   * Handle end date change
   */
  onEndDateChange(event: CustomEvent): void {
    this.pendingEndDate = event.detail.value;
    this.activePreset = null;
  }

  /**
   * Apply a quick date preset immediately
   */
  applyPreset(key: string): void {
    const range = this.getPresetRange(key);
    if (!range) {
      return;
    }

    this.startDate = range.start;
    this.endDate = range.end;
    this.pendingStartDate = range.start;
    this.pendingEndDate = range.end;
    this.activePreset = key;

    this.loadTransactions();
    this.loadSummary();
  }

  /**
   * Compute start/end ISO strings for a preset (local time, matching ion-datetime output)
   */
  private getPresetRange(key: string): { start: string; end: string } | null {
    const now = new Date();
    const startOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const endOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(23, 59, 59, 999);
      return x;
    };

    switch (key) {
      case 'today':
        return { start: this.toLocalIso(startOfDay(now)), end: this.toLocalIso(endOfDay(now)) };
      case '7d': {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        return { start: this.toLocalIso(startOfDay(start)), end: this.toLocalIso(endOfDay(now)) };
      }
      case '30d': {
        const start = new Date(now);
        start.setDate(now.getDate() - 29);
        return { start: this.toLocalIso(startOfDay(start)), end: this.toLocalIso(endOfDay(now)) };
      }
      case 'thisMonth': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: this.toLocalIso(startOfDay(start)), end: this.toLocalIso(endOfDay(end)) };
      }
      case 'lastMonth': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: this.toLocalIso(startOfDay(start)), end: this.toLocalIso(endOfDay(end)) };
      }
      case 'thisYear': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        return { start: this.toLocalIso(startOfDay(start)), end: this.toLocalIso(endOfDay(end)) };
      }
      default:
        return null;
    }
  }

  /**
   * Format a Date as a local ISO string with timezone offset (matches ion-datetime output)
   */
  private toLocalIso(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const mo = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const s = pad(date.getSeconds());

    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const oh = pad(Math.floor(abs / 60));
    const om = pad(abs % 60);

    return `${y}-${mo}-${d}T${h}:${mi}:${s}${sign}${oh}:${om}`;
  }

  /**
   * Human-readable summary for the filter header
   */
  getFilterSummary(): string {
    if (!this.hasActiveDateFilter()) {
      return 'Semua tanggal';
    }
    const preset = this.datePresets.find((p) => p.key === this.activePreset);
    const range = this.formatDateRange();
    return preset ? `${preset.label} · ${range}` : range;
  }

  /**
   * Apply date filter to both table and summary
   */
  applyDateFilter(): void {
    if (this.pendingStartDate) {
      this.startDate = this.pendingStartDate;
    }
    if (this.pendingEndDate) {
      this.endDate = this.pendingEndDate;
    }

    console.log('[CashTransactionsPage] Applying date filter:', {
      startDate: this.startDate,
      endDate: this.endDate
    });

    // Reload both transactions and summary with date filter
    this.loadTransactions();
    this.loadSummary();
  }

  /**
   * Clear date filter
   */
  clearDateFilter(): void {
    this.startDate = null;
    this.endDate = null;
    this.pendingStartDate = null;
    this.pendingEndDate = null;
    this.activePreset = null;

    console.log('[CashTransactionsPage] Clearing date filter');

    // Reload both transactions and summary without filter
    this.loadTransactions();
    this.loadSummary();
  }

  /**
   * Check if date filter is active
   */
  hasActiveDateFilter(): boolean {
    return this.startDate !== null || this.endDate !== null;
  }

  /**
   * Format date range for display
   */
  formatDateRange(): string {
    if (!this.startDate && !this.endDate) {
      return '';
    }

    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (this.startDate && this.endDate) {
      return `${formatDate(this.startDate)} - ${formatDate(this.endDate)}`;
    } else if (this.startDate) {
      return `Dari ${formatDate(this.startDate)}`;
    } else {
      return `Sampai ${formatDate(this.endDate)}`;
    }
  }
}
