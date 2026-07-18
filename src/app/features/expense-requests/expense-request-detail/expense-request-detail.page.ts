import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { IonicModule, AlertController } from '@ionic/angular';
import { ExpenseRequestsService } from '../expense-requests.service';
import { FileAttachmentsService } from '@core/services/file-attachments.service';
import { AuthService } from '@core/auth/auth.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  ExpenseRequest,
  ExpenseRequestStatus,
  ExpensePaymentMethod,
  EXPENSE_REQUEST_STATUS_LABELS,
  EXPENSE_REQUEST_STATUS_COLORS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  FileAttachment,
} from '../expense-requests.model';

/**
 * Expense Request Detail Page
 * Shows a single request with photos, approval history, and contextual actions:
 *  - approve/reject : ADMIN / ACCOUNTANT / SUPERADMIN (only while PENDING)
 *  - cancel         : the requester (only while PENDING)
 */
@Component({
  selector: 'app-expense-request-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './expense-request-detail.page.html',
  styleUrls: ['./expense-request-detail.page.scss'],
})
export class ExpenseRequestDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private expenseRequestsService = inject(ExpenseRequestsService);
  private fileAttachmentsService = inject(FileAttachmentsService);
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  request: ExpenseRequest | null = null;
  loading = true;
  error: string | null = null;

  private currentUserId = '';
  private role = '';
  canApproveAction = false;
  isOwner = false;

  readonly STATUS_LABELS = EXPENSE_REQUEST_STATUS_LABELS;
  readonly STATUS_COLORS = EXPENSE_REQUEST_STATUS_COLORS;
  readonly METHOD_LABELS = EXPENSE_PAYMENT_METHOD_LABELS;
  readonly ExpenseRequestStatus = ExpenseRequestStatus;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.subscriptions.push(
      this.authService.authState.subscribe((state) => {
        this.currentUserId = state.user?.id || '';
        this.role = state.user?.role?.name || '';
        this.canApproveAction = ['ADMIN', 'ACCOUNTANT', 'SUPERADMIN'].includes(this.role);
        this.isOwner = !!this.request && this.request.requestedById === this.currentUserId;
      })
    );

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Request tidak ditemukan';
      this.loading = false;
      return;
    }
    this.loadRequest(id);
  }

  retry(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.error = null;
    this.loadRequest(id);
  }

  loadRequest(id: string): void {
    this.loading = true;
    this.subscriptions.push(
      this.expenseRequestsService.getById(id).subscribe({
        next: (request) => {
          if (!request) {
            this.error = 'Request tidak ditemukan';
            this.loading = false;
            return;
          }
          this.request = request;
          this.isOwner = request.requestedById === this.currentUserId;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Gagal memuat detail request';
          this.loading = false;
          console.error('Error loading expense request detail:', error);
        },
      })
    );
  }

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------

  async approveRequest(): Promise<void> {
    if (!this.request) return;
    const alert = await this.alertController.create({
      header: 'Setujui Request',
      message: `Setujui request ${this.request.requestNumber}?`,
      inputs: [{ name: 'comments', type: 'textarea', placeholder: 'Catatan (opsional)' }],
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Setujui',
          handler: (data) => {
            this.performApprove(this.request!.id, data.comments || '');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async rejectRequest(): Promise<void> {
    if (!this.request) return;
    const alert = await this.alertController.create({
      header: 'Tolak Request',
      message: `Tolak request ${this.request.requestNumber}?`,
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Alasan penolakan *', value: '' }],
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Tolak',
          role: 'destructive',
          handler: (data) => {
            if (!data.reason || data.reason.trim() === '') {
              this.toastService.error('Alasan penolakan wajib diisi');
              return false;
            }
            this.performReject(this.request!.id, data.reason);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async cancelRequest(): Promise<void> {
    if (!this.request) return;
    const alert = await this.alertController.create({
      header: 'Batalkan Request',
      message: `Batalkan request ${this.request.requestNumber}? Tindakan ini tidak dapat dibatalkan.`,
      buttons: [
        { text: 'Tidak', role: 'cancel' },
        {
          text: 'Ya, Batalkan',
          role: 'destructive',
          handler: () => {
            this.performCancel(this.request!.id);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private performApprove(id: string, comments: string): void {
    this.loadingService.show({ message: 'Menyetujui request...' });
    this.subscriptions.push(
      this.expenseRequestsService.approve(id, { comments }).subscribe({
        next: (updated) => {
          this.loadingService.dismiss();
          this.toastService.success('Request disetujui & diposting ke kas');
          if (updated) this.request = updated;
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menyetujui request');
          console.error('Approve error:', error);
        },
      })
    );
  }

  private performReject(id: string, reason: string): void {
    this.loadingService.show({ message: 'Menolak request...' });
    this.subscriptions.push(
      this.expenseRequestsService.reject(id, { reason }).subscribe({
        next: (updated) => {
          this.loadingService.dismiss();
          this.toastService.success('Request ditolak');
          if (updated) this.request = updated;
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menolak request');
          console.error('Reject error:', error);
        },
      })
    );
  }

  private performCancel(id: string): void {
    this.loadingService.show({ message: 'Membatalkan request...' });
    this.subscriptions.push(
      this.expenseRequestsService.cancel(id).subscribe({
        next: (updated) => {
          this.loadingService.dismiss();
          this.toastService.success('Request dibatalkan');
          if (updated) this.request = updated;
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal membatalkan request');
          console.error('Cancel error:', error);
        },
      })
    );
  }

  // ----------------------------------------------------------------
  // State helpers (template)
  // ----------------------------------------------------------------

  isPending(): boolean {
    return this.request?.status === ExpenseRequestStatus.PENDING;
  }

  isApproved(): boolean {
    return this.request?.status === ExpenseRequestStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.request?.status === ExpenseRequestStatus.REJECTED;
  }

  canCancel(): boolean {
    return !!this.request && this.isOwner && this.request.status === ExpenseRequestStatus.PENDING;
  }

  hasFiles(): boolean {
    return !!this.request?.files && this.request.files.length > 0;
  }

  hasHistory(): boolean {
    return !!this.request?.approvalHistories && this.request.approvalHistories.length > 0;
  }

  // ----------------------------------------------------------------
  // Display helpers
  // ----------------------------------------------------------------

  formatCurrency(amount: number | string): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(amount) || 0);
  }

  formatDate(date?: string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDateTime(date?: string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusColor(status?: string): string {
    if (!status) return 'medium';
    return this.STATUS_COLORS[status as ExpenseRequestStatus] || 'medium';
  }

  getStatusLabel(status?: string): string {
    if (!status) return '-';
    return this.STATUS_LABELS[status as ExpenseRequestStatus] || status;
  }

  getMethodLabel(): string {
    const m = this.request?.paymentMethod as ExpensePaymentMethod | undefined;
    if (!m) return '-';
    return this.METHOD_LABELS[m] || m;
  }

  getRequesterName(): string {
    const r = this.request?.requester;
    if (!r) return '-';
    if (r.firstName || r.lastName) return `${r.firstName || ''} ${r.lastName || ''}`.trim();
    return r.username || '-';
  }

  getApproverName(): string {
    const a = this.request?.approver;
    if (!a) return '-';
    if (a.firstName || a.lastName) return `${a.firstName || ''} ${a.lastName || ''}`.trim();
    return a.username || '-';
  }

  getResidentName(): string {
    const r = this.request?.resident;
    if (!r) return '-';
    return `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.residentCode || '-';
  }

  getCategoryName(): string {
    return this.request?.category?.categoryName || '-';
  }

  // File helpers
  getFileUrl(file: FileAttachment): string {
    return this.fileAttachmentsService.fileUrl(file.filePath);
  }

  isImage(file: FileAttachment): boolean {
    return file.mimeType?.startsWith('image/') || false;
  }

  getFileIcon(mimeType: string): string {
    if (mimeType?.startsWith('image/')) return 'image-outline';
    if (mimeType === 'application/pdf') return 'document-text-outline';
    return 'document-outline';
  }

  getFileSize(bytes: number): string {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  viewFile(file: FileAttachment): void {
    const url = this.getFileUrl(file);
    if (this.isImage(file)) {
      window.open(url, '_blank');
    } else {
      window.open(url, '_blank');
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
