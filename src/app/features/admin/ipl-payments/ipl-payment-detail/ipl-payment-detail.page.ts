import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { IplPaymentsService } from '../ipl-payments.service';
import { ResidentPaymentsService } from '../../resident-payments/resident-payments.service';
import {
  IplPayment,
  IplPaymentStatus,
  IplPaymentMethod,
  IPL_PAYMENT_STATUS_LABELS,
  IPL_PAYMENT_STATUS_COLORS,
  IPL_PAYMENT_METHOD_LABELS,
  FileAttachment,
  ReceiptInfo
} from '../ipl-payments.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { environment } from 'src/environments/environment';
import { SafeUrlPipe } from '@shared/pipes/safe-url.pipe';

/**
 * IPL Payment Detail Page
 * Displays detailed information about a single IPL payment
 * Used by coordinators (view block payments) and admins (view/approve payments)
 */
@Component({
  selector: 'app-ipl-payment-detail',
  standalone: true,
  imports: [CommonModule, IonicModule, SafeUrlPipe],
  templateUrl: './ipl-payment-detail.page.html',
  styleUrls: ['./ipl-payment-detail.page.scss']
})
export class IplPaymentDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private iplPaymentsService = inject(IplPaymentsService);
  private residentPaymentsService = inject(ResidentPaymentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  payment: IplPayment | null = null;
  loading = true;
  error: string | null = null;
  receipt: ReceiptInfo | null = null;
  receiptLoading = false;
  // Separate kwitansi for the iuran kegiatan warga (ResidentPayment receipt)
  kegiatanReceipt: ReceiptInfo | null = null;

  private subscriptions: Subscription[] = [];

  // Display labels
  readonly STATUS_LABELS = IPL_PAYMENT_STATUS_LABELS;
  readonly STATUS_COLORS = IPL_PAYMENT_STATUS_COLORS;
  readonly METHOD_LABELS = IPL_PAYMENT_METHOD_LABELS;
  readonly IplPaymentStatus = IplPaymentStatus;

  ngOnInit(): void {
    this.loadPayment();
  }

  /**
   * Load payment data
   */
  private async loadPayment(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID Pembayaran tidak diberikan';
      this.loading = false;
      return;
    }

    await this.loadingService.show({ message: 'Memuat detail pembayaran...' });

    this.subscriptions.push(
      this.iplPaymentsService.getById(id).subscribe({
        next: (payment) => {
          this.loadingService.dismiss();
          if (payment) {
            this.payment = payment;
            this.loading = false;
            // Load receipt if payment is approved
            if (payment.status === IplPaymentStatus.APPROVED) {
              this.loadReceipt(id);
              // Also load the separate kwitansi for the iuran kegiatan warga (if any)
              if (payment.kegiatanPayment) {
                this.loadKegiatanReceipt(payment.kegiatanPayment.id);
              }
            }
          } else {
            this.error = 'Pembayaran tidak ditemukan';
            this.loading = false;
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.error = 'Gagal memuat detail pembayaran';
          this.loading = false;
          console.error('Error loading payment:', error);
        }
      })
    );
  }

  /**
   * Load receipt info for approved payment
   */
  private loadReceipt(paymentId: string): void {
    this.receiptLoading = true;
    this.subscriptions.push(
      this.iplPaymentsService.getReceipt(paymentId).subscribe({
        next: (receipt) => {
          this.receipt = receipt;
          this.receiptLoading = false;
        },
        error: (error) => {
          console.error('Error loading receipt:', error);
          this.receipt = null;
          this.receiptLoading = false;
        }
      })
    );
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/ipl-payments']);
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(): void {
    if (this.payment) {
      this.router.navigate(['/admin/ipl-payments', this.payment.id, 'edit']);
    }
  }

  /**
   * Approve payment
   */
  async approvePayment(): Promise<void> {
    if (!this.payment) return;

    const alert = await this.alertController.create({
      header: 'Setujui Pembayaran',
      message: `Setujui pembayaran ${this.payment.paymentNumber} dari ${this.getResidentName()}?`,
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
            this.handleApprove(data.comments || '');
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
  private handleApprove(comments: string): void {
    if (!this.payment) return;

    this.loadingService.show({ message: 'Memproses persetujuan...' });

    this.subscriptions.push(
      this.iplPaymentsService.approve(this.payment.id, { comments }).subscribe({
        next: (updated) => {
          this.loadingService.dismiss();
          if (updated) {
            this.payment = updated;
            this.toastService.success('Pembayaran disetujui');
            // Load receipt after approval
            this.loadReceipt(this.payment.id);
            if (this.payment.kegiatanPayment) {
              this.loadKegiatanReceipt(this.payment.kegiatanPayment.id);
            }
          }
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
   * Reject payment
   */
  async rejectPayment(): Promise<void> {
    if (!this.payment) return;

    const alert = await this.alertController.create({
      header: 'Tolak Pembayaran',
      message: `Tolak pembayaran ${this.payment.paymentNumber} dari ${this.getResidentName()}?`,
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
            this.handleReject(data.rejectionReason);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Handle reject action
   */
  private handleReject(rejectionReason: string): void {
    if (!this.payment) return;

    this.loadingService.show({ message: 'Memproses penolakan...' });

    this.subscriptions.push(
      this.iplPaymentsService.reject(this.payment.id, { rejectionReason }).subscribe({
        next: (updated) => {
          this.loadingService.dismiss();
          if (updated) {
            this.payment = updated;
            this.toastService.success('Pembayaran ditolak');
          }
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
   * Show delete confirmation
   */
  async confirmDelete(): Promise<void> {
    if (!this.payment) return;

    const alert = await this.alertController.create({
      header: 'Hapus Pembayaran',
      message: `Apakah Anda yakin ingin menghapus pembayaran "${this.payment.paymentNumber}"? Tindakan ini tidak dapat dibatalkan.`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
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

  /**
   * Handle delete
   */
  private handleDelete(): void {
    if (!this.payment) return;

    this.loadingService.show({ message: 'Menghapus pembayaran...' });

    this.subscriptions.push(
      this.iplPaymentsService.delete(this.payment.id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Pembayaran berhasil dihapus');
          this.router.navigate(['/admin/ipl-payments']);
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus pembayaran');
          console.error('Delete payment error:', error);
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
  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Format date time
   */
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

  /**
   * Get status color
   */
  getStatusColor(): string {
    if (!this.payment) return 'medium';
    return this.STATUS_COLORS[this.payment.status] || 'medium';
  }

  /**
   * Get status label by status string
   */
  getStatusLabel(status: string): string {
    if (!status) return '-';
    return this.STATUS_LABELS[status as IplPaymentStatus] || status;
  }

  /**
   * Get method label
   */
  getMethodLabel(): string {
    if (!this.payment) return '-';
    return this.METHOD_LABELS[this.payment.paymentMethod] || this.payment.paymentMethod;
  }

  /**
   * Get method color
   */
  getMethodColor(): string {
    if (!this.payment) return 'medium';
    const colorMap: Record<IplPaymentMethod, string> = {
      [IplPaymentMethod.CASH]: 'medium',
      [IplPaymentMethod.TRANSFER]: 'primary',
      [IplPaymentMethod.E_WALLET]: 'tertiary',
      [IplPaymentMethod.CARD]: 'secondary'
    };
    return colorMap[this.payment.paymentMethod] || 'medium';
  }

  /**
   * Get resident name
   */
  getResidentName(): string {
    if (!this.payment?.resident) return '-';
    return `${this.payment.resident.firstName} ${this.payment.resident.lastName}`;
  }

  /**
   * Get resident address
   */
  getResidentAddress(): string {
    if (!this.payment?.resident) return '-';
    const block = this.payment.resident.houseBlock;
    const blockName = block ? block.blockName : '-';
    return `${blockName} - ${this.payment.resident.unitNumber}`;
  }

  /**
   * Get resident phone
   */
  getResidentPhone(): string {
    return this.payment?.resident?.phoneNumber || '-';
  }

  /**
   * Get period name
   */
  getPeriodName(): string {
    return this.payment?.period?.periodName || '-';
  }

  /**
   * Get block name
   */
  getBlockName(): string {
    if (!this.payment?.resident?.houseBlock) return '-';
    return this.payment.resident.houseBlock.blockName;
  }

  /**
   * Get submitter name
   */
  getSubmitterName(): string {
    if (!this.payment?.submitter) return '-';
    if (this.payment.submitter.firstName && this.payment.submitter.lastName) {
      return `${this.payment.submitter.firstName} ${this.payment.submitter.lastName}`;
    }
    return this.payment.submitter.username || '-';
  }

  /**
   * Get approver name
   */
  getApproverName(): string {
    if (!this.payment?.approver) return '-';
    if (this.payment.approver.firstName && this.payment.approver.lastName) {
      return `${this.payment.approver.firstName} ${this.payment.approver.lastName}`;
    }
    return this.payment.approver.username || '-';
  }

  /**
   * Check if payment is pending
   */
  isPending(): boolean {
    return this.payment?.status === IplPaymentStatus.PENDING;
  }

  /**
   * Check if payment is approved
   */
  isApproved(): boolean {
    return this.payment?.status === IplPaymentStatus.APPROVED;
  }

  /**
   * Check if payment is rejected
   */
  isRejected(): boolean {
    return this.payment?.status === IplPaymentStatus.REJECTED;
  }

  /**
   * Check if payment is overdue (past due date of period)
   */
  isOverdue(): boolean {
    if (!this.payment?.period?.dueDate) return false;
    if (this.payment.status === IplPaymentStatus.APPROVED || this.payment.status === IplPaymentStatus.REJECTED) {
      return false;
    }
    const today = new Date();
    const dueDate = new Date(this.payment.period.dueDate);
    return dueDate < today;
  }

  /**
   * Get calculation details
   */
  getCalculationDetails(): { landArea: number; percentage: number; baseRate: number } {
    if (!this.payment) return { landArea: 0, percentage: 0, baseRate: 0 };
    return {
      landArea: this.payment.landArea || 0,
      percentage: this.payment.iplPercentage || 0,
      baseRate: this.payment.baseRate || 0
    };
  }

  /**
   * Check if has files
   */
  hasFiles(): boolean {
    return !!this.payment?.files && this.payment.files.length > 0;
  }

  /**
   * Check if has approval history
   */
  hasApprovalHistory(): boolean {
    return !!this.payment?.approvalHistories && this.payment.approvalHistories.length > 0;
  }

  /**
   * Get file icon based on mime type
   */
  getFileIcon(mimeType: string): string {
    if (mimeType.includes('image')) return 'image-outline';
    if (mimeType.includes('pdf')) return 'document-text-outline';
    return 'document-outline';
  }

  /**
   * Get file size in human readable format
   */
  getFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Get full file URL
   */
  getFileUrl(file: FileAttachment): string {
    // Use the base URL from environment and append file path
    const baseUrl = environment.apiUrl.replace('/api/v1', '');
    return `${baseUrl}${file.filePath}`;
  }

  /**
   * Check if file is an image
   */
  isImage(file: FileAttachment): boolean {
    return file.mimeType?.startsWith('image/') || false;
  }

  /**
   * View file (opens image in modal or downloads other files)
   */
  async viewFile(file: FileAttachment): Promise<void> {
    const fileUrl = this.getFileUrl(file);

    if (this.isImage(file)) {
      // Open image in a modal
      await this.openImageModal(file);
    } else {
      // For non-image files, open in new tab
      window.open(fileUrl, '_blank');
    }
  }

  /**
   * Open image in modal
   */
  async openImageModal(file: FileAttachment): Promise<void> {
    const fileUrl = this.getFileUrl(file);

    // For now, open in new tab (simpler approach)
    // Can be enhanced with a custom modal later
    window.open(fileUrl, '_blank');
  }

  /**
   * Handle image loading error
   */
  onImageError(event: any): void {
    console.error('Image failed to load:', event);
    event.target.style.display = 'none';
  }

  /**
   * Download receipt
   */
  downloadReceipt(): void {
    if (!this.payment) return;
    if (this.receipt && this.receipt.url) {
      window.open(this.receipt.url, '_blank');
    } else {
      this.toastService.error('Kwitansi belum tersedia');
    }
  }

  /**
   * Check if receipt is available (for approved payments)
   */
  hasReceipt(): boolean {
    return this.isApproved() && !!this.receipt;
  }

  /**
   * Check if receipt is loading
   */
  isReceiptLoading(): boolean {
    return this.receiptLoading;
  }

  /**
   * Get receipt file URL
   */
  getReceiptUrl(): string {
    if (!this.receipt) return '';
    const baseUrl = environment.apiUrl.replace('/api/v1', '');
    return `${baseUrl}${this.receipt.filePath}`;
  }

  /**
   * Get receipt file name
   */
  getReceiptFileName(): string {
    return this.receipt?.fileName || 'Kwitansi.pdf';
  }

  /**
   * Check if this is a multi-month payment
   */
  isMultiMonthPayment(): boolean {
    return !!(this.payment?._meta?.isMultiMonth) || !!this.payment?.paymentGroupId;
  }

  /**
   * Get month count for multi-month payments
   */
  getMonthCount(): number {
    return this.payment?._meta?.monthCount || 1;
  }

  /**
   * Get total amount for multi-month payments
   * @deprecated Use getGrandTotal() instead
   */
  getTotalAmount(): number {
    return this.payment?._meta?.grandTotal || this.payment?.calculatedAmount || 0;
  }

  /**
   * Get payment group ID
   */
  getPaymentGroupId(): string | null {
    return this.payment?.paymentGroupId || null;
  }

  /**
   * Get all payment IDs in the group
   */
  getAllPaymentIds(): string[] {
    return this.payment?._meta?.allPaymentIds || [];
  }

  /**
   * Get formatted multi-month info
   */
  getMultiMonthInfo(): string {
    if (!this.isMultiMonthPayment()) return '';
    const monthCount = this.getMonthCount();
    const totalAmount = this.getTotalAmount();
    return `Pembayaran ${monthCount} bulan - Total: ${this.formatCurrency(totalAmount)}`;
  }

  /**
   * Check if has kegiatan payment
   */
  hasKegiatanPayment(): boolean {
    return !!this.payment?.kegiatanPayment;
  }

  /**
   * Get kegiatan payment amount
   */
  getKegiatanAmount(): number {
    return this.payment?.kegiatanPayment?.amount || 0;
  }

  /**
   * Get kegiatan payment number
   */
  getKegiatanPaymentNumber(): string {
    return this.payment?.kegiatanPayment?.paymentNumber || '-';
  }

  /**
   * Get kegiatan invoice ID
   */
  getKegiatanInvoiceId(): string {
    return this.payment?.kegiatanPayment?.invoiceId || '-';
  }

  /**
   * Load the separate kwitansi for the iuran kegiatan warga (ResidentPayment receipt)
   */
  private loadKegiatanReceipt(kegiatanPaymentId: string): void {
    this.subscriptions.push(
      this.residentPaymentsService.getReceipt(kegiatanPaymentId).subscribe({
        next: (receipt) => {
          this.kegiatanReceipt = receipt;
        },
        error: (error) => {
          console.error('Error loading kegiatan receipt:', error);
          this.kegiatanReceipt = null;
        }
      })
    );
  }

  /**
   * Whether the separate kegiatan kwitansi is available
   */
  hasKegiatanReceipt(): boolean {
    return this.hasKegiatanPayment() && !!this.kegiatanReceipt;
  }

  /**
   * Get the kegiatan kwitansi URL
   */
  getKegiatanReceiptUrl(): string {
    if (!this.kegiatanReceipt) return '';
    const baseUrl = environment.apiUrl.replace('/api/v1', '');
    return `${baseUrl}${this.kegiatanReceipt.filePath}`;
  }

  /**
   * Open the kegiatan kwitansi in a new tab
   */
  viewKegiatanReceipt(): void {
    if (this.kegiatanReceipt) {
      window.open(this.getKegiatanReceiptUrl(), '_blank');
    } else {
      this.toastService.error('Kwitansi iuran kegiatan belum tersedia');
    }
  }

  /**
   * Get total payment amount including IPL and kegiatan
   */
  getGrandTotal(): number {
    const meta = this.payment?._meta;
    if (meta?.grandTotal) {
      return meta.grandTotal;
    }
    // Fallback calculation
    const iplTotal = this.payment?.calculatedAmount || 0;
    const kegiatanTotal = this.getKegiatanAmount();
    return iplTotal + kegiatanTotal;
  }

  /**
   * Get total IPL amount for multi-month payments
   */
  getTotalIplAmount(): number {
    return this.payment?._meta?.totalIplAmount || this.payment?.calculatedAmount || 0;
  }

  /**
   * Get formatted payment summary
   */
  getPaymentSummary(): { iplTotal: number; kegiatanTotal: number; grandTotal: number; monthCount: number } {
    return {
      iplTotal: this.getTotalIplAmount(),
      kegiatanTotal: this.getKegiatanAmount(),
      grandTotal: this.getGrandTotal(),
      monthCount: this.getMonthCount()
    };
  }

  /**
   * Check if should show enhanced summary (multi-month or has kegiatan)
   */
  shouldShowEnhancedSummary(): boolean {
    return this.isMultiMonthPayment() || this.hasKegiatanPayment();
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
