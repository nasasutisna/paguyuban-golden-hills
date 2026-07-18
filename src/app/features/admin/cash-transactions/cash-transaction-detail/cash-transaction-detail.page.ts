import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CashTransactionsService } from '../cash-transactions.service';
import {
  CashTransaction,
  TransactionType,
  PaymentMethod,
  ApprovalStatus,
  TRANSACTION_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  APPROVAL_STATUS_LABELS,
  REFERENCE_TYPE_LABELS,
  REFERENCE_TYPES
} from '../cash-transactions.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';

/**
 * Cash Transaction Detail Page
 * Displays detailed information about a single cash transaction,
 * with edit / approve / reject / delete actions.
 */
@Component({
  selector: 'app-cash-transaction-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './cash-transaction-detail.page.html',
  styleUrls: ['./cash-transaction-detail.page.scss']
})
export class CashTransactionDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cashTransactionsService = inject(CashTransactionsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  transaction: CashTransaction | null = null;
  loading = true;
  error: string | null = null;

  private subscriptions: Subscription[] = [];

  // Expose enums/labels to the template
  readonly TransactionType = TransactionType;
  readonly ApprovalStatus = ApprovalStatus;
  readonly TRANSACTION_TYPE_LABELS = TRANSACTION_TYPE_LABELS;
  readonly PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;
  readonly APPROVAL_STATUS_LABELS = APPROVAL_STATUS_LABELS;
  readonly REFERENCE_TYPE_LABELS = REFERENCE_TYPE_LABELS;

  ngOnInit(): void {
    this.loadTransaction();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Resolve the cash-transaction id from the route. The detail is mounted at
   * `cash-transactions/:idcash` (a componentless wrapper) → `` child, so the
   * `:idcash` param lives on the parent snapshot and must be walked up to.
   */
  private resolveCashTxId(): string | null {
    let snap: ActivatedRouteSnapshot | null = this.route.snapshot;
    while (snap) {
      const v = snap.paramMap.get('idcash');
      if (v) return v;
      snap = snap.parent;
    }
    return null;
  }

  /**
   * Load transaction data
   */
  private async loadTransaction(): Promise<void> {
    const id = this.resolveCashTxId();
    if (!id) {
      this.error = 'ID Transaksi tidak diberikan';
      this.loading = false;
      return;
    }

    await this.loadingService.show({ message: 'Memuat detail transaksi...' });

    this.subscriptions.push(
      this.cashTransactionsService.getById(id).subscribe({
        next: (transaction) => {
          this.loadingService.dismiss();
          if (transaction) {
            this.transaction = transaction;
            this.loading = false;
          } else {
            this.error = 'Transaksi tidak ditemukan';
            this.loading = false;
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.error = 'Gagal memuat detail transaksi';
          this.loading = false;
          console.error('Error loading transaction:', error);
        }
      })
    );
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/cash-transactions']);
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(): void {
    if (this.transaction) {
      this.router.navigate(['/admin/cash-transactions', this.transaction.id, 'edit']);
    }
  }

  /**
   * Resolve the linked source entity (if any) that this cash transaction
   * was generated from, so the user can jump to its detail page.
   * Returns null when the transaction is not linked to a detail-able entity.
   */
  getRelatedLink(): { title: string; subtitle: string; icon: string; route: string[] } | null {
    const t = this.transaction;
    if (!t?.referenceType || !t?.referenceId) return null;

    switch (t.referenceType) {
      case REFERENCE_TYPES.EXPENSE_REQUEST:
        return {
          title: 'Pengajuan Pengeluaran',
          subtitle: t.referenceNumber || 'Lihat detail pengajuan',
          icon: 'document-text-outline',
          route: ['/admin/cash-transactions', t.id, 'expense-requests', t.referenceId]
        };
      case REFERENCE_TYPES.IPL_PAYMENT:
        return {
          title: 'Pembayaran IPL',
          subtitle: t.referenceNumber || 'Lihat detail pembayaran',
          icon: 'home-outline',
          route: ['/admin/cash-transactions', t.id, 'ipl-payments', t.referenceId]
        };
      case REFERENCE_TYPES.RESIDENT_PAYMENT:
        return {
          title: 'Iuran Warga',
          subtitle: t.referenceNumber || 'Lihat detail pembayaran',
          icon: 'people-outline',
          route: ['/admin/cash-transactions', t.id, 'resident-payments', t.referenceId]
        };
      default:
        return null;
    }
  }

  /**
   * Navigate to the linked source entity's detail page
   */
  navigateToRelated(): void {
    const link = this.getRelatedLink();
    if (link) {
      this.router.navigate(link.route);
    }
  }

  /**
   * Approve transaction (with confirmation)
   */
  async approveTransaction(): Promise<void> {
    if (!this.transaction) return;

    const alert = await this.alertController.create({
      header: 'Setujui Transaksi',
      message: `Setujui transaksi ${this.transaction.transactionNumber || this.transaction.description}?`,
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Setujui',
          handler: () => {
            this.handleApprove();
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private handleApprove(): void {
    if (!this.transaction) return;

    this.loadingService.show({ message: 'Memproses persetujuan...' });

    this.subscriptions.push(
      this.cashTransactionsService.approve(this.transaction.id).subscribe({
        next: (updated) => {
          this.loadingService.dismiss();
          if (updated) {
            this.transaction = updated;
            this.toastService.success('Transaksi disetujui');
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menyetujui transaksi');
          console.error('Approve error:', error);
        }
      })
    );
  }

  /**
   * Reject transaction (with optional reason)
   */
  async rejectTransaction(): Promise<void> {
    if (!this.transaction) return;

    const alert = await this.alertController.create({
      header: 'Tolak Transaksi',
      message: `Tolak transaksi ${this.transaction.transactionNumber || this.transaction.description}?`,
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Alasan penolakan (opsional)'
        }
      ],
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Tolak',
          role: 'destructive',
          handler: (data) => {
            this.handleReject(data.reason || '');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private handleReject(reason: string): void {
    if (!this.transaction) return;

    this.loadingService.show({ message: 'Memproses penolakan...' });

    this.subscriptions.push(
      this.cashTransactionsService.reject(this.transaction.id, reason || undefined).subscribe({
        next: (updated) => {
          this.loadingService.dismiss();
          if (updated) {
            this.transaction = updated;
            this.toastService.success('Transaksi ditolak');
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menolak transaksi');
          console.error('Reject error:', error);
        }
      })
    );
  }

  /**
   * Show delete confirmation
   */
  async confirmDelete(): Promise<void> {
    if (!this.transaction) return;

    const label = this.transaction.transactionNumber || this.transaction.description;
    const alert = await this.alertController.create({
      header: 'Hapus Transaksi',
      message: `Apakah Anda yakin ingin menghapus transaksi "${label}"? Tindakan ini tidak dapat dibatalkan.`,
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: () => {
            this.handleDelete();
          }
        }
      ]
    });

    await alert.present();
  }

  private handleDelete(): void {
    if (!this.transaction) return;

    this.loadingService.show({ message: 'Menghapus transaksi...' });

    this.subscriptions.push(
      this.cashTransactionsService.delete(this.transaction.id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Transaksi berhasil dihapus');
          this.router.navigate(['/admin/cash-transactions']);
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus transaksi');
          console.error('Delete transaction error:', error);
        }
      })
    );
  }

  // ---- Visibility helpers ----

  canEdit(): boolean {
    return !!this.transaction && this.transaction.approvalStatus !== ApprovalStatus.APPROVED;
  }

  canApprove(): boolean {
    return (
      !!this.transaction &&
      this.transaction.requiresApproval &&
      this.transaction.approvalStatus === ApprovalStatus.PENDING
    );
  }

  canDelete(): boolean {
    return !!this.transaction && this.transaction.approvalStatus !== ApprovalStatus.APPROVED;
  }

  isIncome(): boolean {
    return this.transaction?.transactionType === TransactionType.INCOME;
  }

  isExpense(): boolean {
    return this.transaction?.transactionType === TransactionType.EXPENSE;
  }

  isApproved(): boolean {
    return this.transaction?.approvalStatus === ApprovalStatus.APPROVED;
  }

  // ---- Formatters / labels ----

  formatCurrency(amount?: number): string {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatDateTime(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTypeLabel(): string {
    if (!this.transaction) return '-';
    return TRANSACTION_TYPE_LABELS[this.transaction.transactionType] || this.transaction.transactionType;
  }

  getTypeColor(): string {
    if (!this.transaction) return 'medium';
    return this.transaction.transactionType === TransactionType.EXPENSE ? 'danger' : 'success';
  }

  getMethodLabel(): string {
    if (!this.transaction) return '-';
    return PAYMENT_METHOD_LABELS[this.transaction.paymentMethod] || this.transaction.paymentMethod;
  }

  getMethodColor(): string {
    if (!this.transaction) return 'medium';
    const map: Record<string, string> = {
      [PaymentMethod.CASH]: 'medium',
      [PaymentMethod.TRANSFER]: 'primary',
      [PaymentMethod.CARD]: 'secondary'
    };
    return map[this.transaction.paymentMethod] || 'medium';
  }

  getStatusColor(): string {
    if (!this.transaction) return 'medium';
    switch (this.transaction.approvalStatus) {
      case ApprovalStatus.APPROVED:
        return 'success';
      case ApprovalStatus.REJECTED:
        return 'danger';
      case ApprovalStatus.PENDING:
      default:
        return 'warning';
    }
  }

  getStatusLabel(): string {
    if (!this.transaction?.approvalStatus) return '-';
    return APPROVAL_STATUS_LABELS[this.transaction.approvalStatus] || this.transaction.approvalStatus;
  }

  getReferenceTypeLabel(): string {
    if (!this.transaction?.referenceType) return '-';
    return REFERENCE_TYPE_LABELS[this.transaction.referenceType] || this.transaction.referenceType;
  }

  getCategoryName(): string {
    return this.transaction?.category?.categoryName || '-';
  }

  getCreatorName(): string {
    const creator = this.transaction?.creator;
    if (!creator) return this.transaction?.createdBy || '-';
    if (creator.firstName && creator.lastName) {
      return `${creator.firstName} ${creator.lastName}`;
    }
    return creator.username || '-';
  }

  getApproverName(): string {
    const approver = this.transaction?.approver;
    if (!approver) return '-';
    if (approver.firstName && approver.lastName) {
      return `${approver.firstName} ${approver.lastName}`;
    }
    return approver.username || '-';
  }
}
