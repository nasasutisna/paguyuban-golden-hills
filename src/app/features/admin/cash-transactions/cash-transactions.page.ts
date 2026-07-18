import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  TransactionCategory,
  TRANSACTION_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  APPROVAL_STATUS_LABELS
} from './cash-transactions.model';

// Table component and types
import { TableComponent } from '@shared/ui/table/table.component';
import { TableConfig, TableDataSource, TableAction } from '@shared/ui/table/table.model';
import { FormDatePickerComponent } from '@shared/ui/form-controls/form-date-picker/form-date-picker.component';
import { FormSelectComponent } from '@shared/ui/form-controls/form-select/form-select.component';
import { SelectOption } from '@shared/ui/form-controls/form.model';

/**
 * Cash Transactions List Page
 * Displays list of cash transactions with filtering and statistics
 */
@Component({
  selector: 'app-cash-transactions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TableComponent,
    FormDatePickerComponent,
    FormSelectComponent
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

  // Category filter state (null = 'Semua Kategori')
  categories: TransactionCategory[] = [];
  selectedCategoryId: string | null = null;
  selectedCategoryName: string | null | undefined = null;

  // Pagination state (server-side)
  currentPage = 1;
  pageSize = 10;

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

  /**
   * Build category dropdown options, with 'Semua Kategori' (null) as the
   * always-present default so the filter can be cleared inline.
   */
  get categoryOptions(): SelectOption[] {
    return [
      { value: null, label: 'Semua Kategori' },
      ...this.categories.map((c) => ({ value: c.id, label: c.categoryName }))
    ];
  }

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.initializeTableConfig();
    this.loadCategories();
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
        {
          key: 'amount',
          header: 'Nominal',
          type: 'currency',
          sortable: true,
          // Highlight expense amounts in red, income stays default green
          cellClass: (item: CashTransaction) =>
            item.transactionType === TransactionType.EXPENSE ? 'cell-danger' : ''
        },
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
      pageSizeOptions: [10, 25, 50],
      sortable: true,
      pagination: true,
      showFooter: true
    };
  }

  /**
   * Load transaction summary
   */
  private loadSummary(): void {
    this.statsLoading = true;

    this.subscriptions.push(
      this.cashTransactionsService
        .getSummary(
          this.startDate || undefined,
          this.endDate || undefined,
          this.selectedCategoryId || undefined,
        )
        .subscribe({
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
   * Load transaction categories for the filter dropdown
   */
  private loadCategories(): void {
    this.subscriptions.push(
      this.cashTransactionsService.getCategories().subscribe({
        next: (categories) => {
          this.categories = categories;
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.categories = [];
        }
      })
    );
  }

  /**
   * Handle category filter change — applies immediately and reloads the list
   * and summary so the stat cards reflect the selected category.
   */
  onCategoryChange(value: string | null): void {
    this.selectedCategoryId = value;
    this.currentPage = 1;
    this.selectedCategoryName = this.categoryOptions.find(fi => fi.value === value)?.label;
  }

  /**
   * Load transactions
   */
  private loadTransactions(): void {
    this.dataSource.loading = true;

    this.subscriptions.push(
      this.cashTransactionsService.getAll({
        page: this.currentPage,
        limit: this.pageSize,
        categoryId: this.selectedCategoryId || undefined,
        startDate: this.startDate || undefined,
        endDate: this.endDate || undefined
      }).subscribe({
        next: (response: CashTransactionsResponse) => {
          // Create a new object to trigger ngOnChanges in table component
          this.dataSource = {
            data: response.data,
            total: response.total,
            totalPages: response.totalPages,
            loading: false
          };
        },
        error: (error) => {
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
   * Handle start date change (from form-date-picker ngModelChange)
   */
  onStartDateChange(value: string | null): void {
    this.pendingStartDate = value;
    // Manual edit breaks any active preset match
    this.activePreset = null;
  }

  /**
   * Handle end date change (from form-date-picker ngModelChange)
   */
  onEndDateChange(value: string | null): void {
    this.pendingEndDate = value;
    this.activePreset = null;
  }

  /**
   * Handle table page change (server-side pagination)
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadTransactions();
  }

  /**
   * Handle table page size change (server-side pagination)
   */
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadTransactions();
  }

  /**
   * Handle table action click (view/edit/approve/reject/delete).
   * The table only emits the event; the configured handler is invoked here.
   */
  onAction(event: { action: TableAction; item: CashTransaction }): void {
    if (event.action.handler) {
      event.action.handler(event.item);
    }
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
    this.currentPage = 1;

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
    // Sync pending selections to applied filter (null clears the bound side)
    this.startDate = this.pendingStartDate;
    this.endDate = this.pendingEndDate;
    this.currentPage = 1;

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
    this.selectedCategoryId = null;
    this.selectedCategoryName = null;
    this.activePreset = null;
    this.currentPage = 1;
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
