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
import { TableComponent, TableConfig, TableColumn, TableAction, TableFilter } from '@shared/ui/table';

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

  // Data
  dataSource: CashTransaction[] = [];
  summary: TransactionSummary | null = null;
  statsLoading = true;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;

  // Table configuration
  tableConfig: TableConfig = {
    columns: [
      {
        key: 'transactionDate',
        label: 'Tanggal',
        type: 'date',
        sortable: true,
        format: 'DD MMM YYYY'
      } as TableColumn,
      {
        key: 'description',
        label: 'Deskripsi',
        type: 'text',
        sortable: true
      } as TableColumn,
      {
        key: 'transactionType',
        label: 'Jenis',
        type: 'badge',
        sortable: true,
        format: (value: TransactionType) => ({
          text: TRANSACTION_TYPE_LABELS[value] || value,
          color: value === TransactionType.INCOME ? 'success' : 'danger'
        })
      } as TableColumn,
      {
        key: 'category',
        label: 'Kategori',
        type: 'text',
        format: (value: any) => value?.categoryCode || '-'
      } as TableColumn,
      {
        key: 'amount',
        label: 'Nominal',
        type: 'text',
        sortable: true,
        format: (value: number, row: CashTransaction) =>
          `${row.transactionType === TransactionType.INCOME ? '+' : '-'} ${this.formatCurrency(value)}`
      } as TableColumn,
      {
        key: 'paymentMethod',
        label: 'Metode',
        type: 'badge',
        format: (value: PaymentMethod) => ({
          text: PAYMENT_METHOD_LABELS[value] || value,
          color: 'medium'
        })
      } as TableColumn,
      {
        key: 'approvalStatus',
        label: 'Status',
        type: 'badge',
        sortable: true,
        format: (value: ApprovalStatus) => ({
          text: APPROVAL_STATUS_LABELS[value] || value,
          color: this.getStatusColor(value)
        })
      } as TableColumn
    ],
    actions: [
      {
        id: 'view',
        label: 'Lihat',
        icon: 'eye-outline',
        color: 'primary'
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: 'create-outline',
        color: 'tertiary',
        condition: (row: CashTransaction) => row.approvalStatus !== ApprovalStatus.APPROVED
      },
      {
        id: 'approve',
        label: 'Setujui',
        icon: 'checkmark-circle-outline',
        color: 'success',
        condition: (row: CashTransaction) =>
          row.requiresApproval && row.approvalStatus === ApprovalStatus.PENDING
      },
      {
        id: 'reject',
        label: 'Tolak',
        icon: 'close-circle-outline',
        color: 'danger',
        condition: (row: CashTransaction) =>
          row.requiresApproval && row.approvalStatus === ApprovalStatus.PENDING
      },
      {
        id: 'delete',
        label: 'Hapus',
        icon: 'trash-outline',
        color: 'danger',
        condition: (row: CashTransaction) => row.approvalStatus !== ApprovalStatus.APPROVED
      }
    ] as TableAction[],
    filters: [
      {
        key: 'transactionType',
        label: 'Jenis Transaksi',
        type: 'select',
        options: [
          { value: '', label: 'Semua' },
          { value: TransactionType.INCOME, label: 'Pemasukan' },
          { value: TransactionType.EXPENSE, label: 'Pengeluaran' }
        ]
      } as TableFilter,
      {
        key: 'paymentMethod',
        label: 'Metode Pembayaran',
        type: 'select',
        options: [
          { value: '', label: 'Semua' },
          { value: PaymentMethod.CASH, label: PAYMENT_METHOD_LABELS[PaymentMethod.CASH] },
          { value: PaymentMethod.TRANSFER, label: PAYMENT_METHOD_LABELS[PaymentMethod.TRANSFER] },
          { value: PaymentMethod.CARD, label: PAYMENT_METHOD_LABELS[PaymentMethod.CARD] }
        ]
      } as TableFilter,
      {
        key: 'approvalStatus',
        label: 'Status Persetujuan',
        type: 'select',
        options: [
          { value: '', label: 'Semua' },
          { value: ApprovalStatus.PENDING, label: 'Menunggu' },
          { value: ApprovalStatus.APPROVED, label: 'Disetujui' },
          { value: ApprovalStatus.REJECTED, label: 'Ditolak' }
        ]
      } as TableFilter,
      {
        key: 'search',
        label: 'Cari',
        type: 'search',
        placeholder: 'Cari deskripsi atau nomor referensi...'
      } as TableFilter
    ],
    pageSize: 10,
    pageSizeOptions: [10, 25, 50],
    sortable: true,
    pagination: true
  };

  // Status badges configuration
  statusBadges = {
    [TransactionType.INCOME]: { color: 'success', text: 'Pemasukan' },
    [TransactionType.EXPENSE]: { color: 'danger', text: 'Pengeluaran' },
    [ApprovalStatus.PENDING]: { color: 'warning', text: 'Menunggu' },
    [ApprovalStatus.APPROVED]: { color: 'success', text: 'Disetujui' },
    [ApprovalStatus.REJECTED]: { color: 'danger', text: 'Ditolak' }
  };

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.loadSummary();
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Load transaction summary
   */
  private loadSummary(): void {
    this.statsLoading = true;

    this.subscriptions.push(
      this.cashTransactionsService.getSummary().subscribe({
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
   * Load transactions with current filters and pagination
   */
  private loadTransactions(params?: any): void {
    this.subscriptions.push(
      this.cashTransactionsService.getAll({
        page: this.currentPage,
        limit: this.pageSize,
        ...params
      }).subscribe({
        next: (response: CashTransactionsResponse) => {
          this.dataSource = response.data;
          this.totalRecords = response.total;
        },
        error: (error) => {
          console.error('Error loading transactions:', error);
          this.dataSource = [];
          this.totalRecords = 0;
        }
      })
    );
  }

  /**
   * Handle action click from table
   */
  onAction(event: { action: string; row: CashTransaction }): void {
    const { action, row } = event;

    switch (action) {
      case 'view':
        this.navigateToDetail(row.id);
        break;
      case 'edit':
        this.navigateToEdit(row.id);
        break;
      case 'approve':
        this.approveTransaction(row);
        break;
      case 'reject':
        this.rejectTransaction(row);
        break;
      case 'delete':
        this.deleteTransaction(row);
        break;
    }
  }

  /**
   * Handle filter change from table
   */
  onFilterChange(filters: any): void {
    this.currentPage = 1;
    this.loadTransactions(filters);
  }

  /**
   * Handle page change from table
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadTransactions();
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
    // TODO: Show confirmation dialog
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
}
