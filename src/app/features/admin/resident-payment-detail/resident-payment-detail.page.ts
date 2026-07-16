import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ResidentPaymentsService } from '../resident-payments/resident-payments.service';
import {
  ResidentPayment,
  PaymentMethod,
  PaymentStatus,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_COLORS,
  PAYMENT_STATUS_COLORS,
  FileAttachment,
  ReceiptInfo
} from '../resident-payments/resident-payments.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { environment } from 'src/environments/environment';
import { SafeUrlPipe } from '@shared/pipes/safe-url.pipe';

/**
 * Resident Payment Detail Page
 * Displays detailed information about a single resident payment (pembayaran warga)
 */
@Component({
  selector: 'app-resident-payment-detail',
  standalone: true,
  imports: [CommonModule, IonicModule, SafeUrlPipe],
  templateUrl: './resident-payment-detail.page.html',
  styleUrls: ['./resident-payment-detail.page.scss']
})
export class ResidentPaymentDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private residentPaymentsService = inject(ResidentPaymentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  payment: ResidentPayment | null = null;
  loading = true;
  error: string | null = null;

  // Kwitansi (receipt) + bukti transfer (proof file)
  receipt: ReceiptInfo | null = null;
  receiptLoading = false;
  proofFiles: FileAttachment[] = [];

  private subscriptions: Subscription[] = [];

  // Display labels
  readonly PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;
  readonly PAYMENT_STATUS_LABELS = PAYMENT_STATUS_LABELS;
  readonly PAYMENT_METHOD_COLORS = PAYMENT_METHOD_COLORS;
  readonly PAYMENT_STATUS_COLORS = PAYMENT_STATUS_COLORS;
  readonly PaymentStatus = PaymentStatus;

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
      this.residentPaymentsService.getById(id).subscribe({
        next: (payment) => {
          this.loadingService.dismiss();
          if (payment) {
            this.payment = payment;
            this.loading = false;
            // Always load the bukti transfer (proof file)
            this.loadProofFiles(id);
            // Kwitansi only exists once the payment is COMPLETED (verified)
            if (payment.status === PaymentStatus.COMPLETED) {
              this.loadReceipt(id);
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
   * Load bukti transfer (PAYMENT_PROOF) files for the payment
   */
  private loadProofFiles(paymentId: string): void {
    this.subscriptions.push(
      this.residentPaymentsService.getFilesByEntity(paymentId).subscribe({
        next: (files) => {
          this.proofFiles = files.filter(f => f.category === 'PAYMENT_PROOF');
        },
        error: (error) => {
          console.error('Error loading proof files:', error);
          this.proofFiles = [];
        }
      })
    );
  }

  /**
   * Load kwitansi info for a completed payment
   */
  private loadReceipt(paymentId: string): void {
    this.receiptLoading = true;
    this.subscriptions.push(
      this.residentPaymentsService.getReceipt(paymentId).subscribe({
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
    this.router.navigate(['/admin/resident-payments']);
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
      this.residentPaymentsService.delete(this.payment.id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Pembayaran berhasil dihapus');
          this.router.navigate(['/admin/resident-payments']);
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
   * Verify (complete) the payment — generates kwitansi + ledger on the backend.
   */
  async verifyPayment(): Promise<void> {
    if (!this.payment) return;

    const alert = await this.alertController.create({
      header: 'Verifikasi Pembayaran',
      message: `Verifikasi pembayaran ${this.payment.paymentNumber} dari ${this.getResidentName()}? Kwitansi akan dibuat otomatis.`,
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Verifikasi',
          handler: () => {
            this.handleVerify();
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Handle verify action
   */
  private handleVerify(): void {
    if (!this.payment) return;

    this.loadingService.show({ message: 'Memverifikasi pembayaran...' });

    this.subscriptions.push(
      this.residentPaymentsService.verify(this.payment.id).subscribe({
        next: (updated) => {
          this.loadingService.dismiss();
          if (updated) {
            this.payment = updated;
            this.toastService.success('Pembayaran terverifikasi');
            // Kwitansi is generated async (setImmediate) — start polling for it
            this.loadReceipt(this.payment.id);
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal verifikasi pembayaran');
          console.error('Verify error:', error);
        }
      })
    );
  }

  // ---- Status helpers ----

  isPending(): boolean {
    return this.payment?.status === PaymentStatus.PENDING;
  }

  isCompleted(): boolean {
    return this.payment?.status === PaymentStatus.COMPLETED;
  }

  // ---- Bukti transfer (proof file) helpers ----

  hasProofFiles(): boolean {
    return this.proofFiles.length > 0;
  }

  getFileIcon(mimeType: string): string {
    if (mimeType?.includes('image')) return 'image-outline';
    if (mimeType?.includes('pdf')) return 'document-text-outline';
    return 'document-outline';
  }

  getFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getFileUrl(file: FileAttachment): string {
    const baseUrl = environment.apiUrl.replace('/api/v1', '');
    return `${baseUrl}${file.filePath}`;
  }

  isImage(file: FileAttachment): boolean {
    return file.mimeType?.startsWith('image/') || false;
  }

  viewFile(file: FileAttachment): void {
    window.open(this.getFileUrl(file), '_blank');
  }

  onImageError(event: any): void {
    console.error('Image failed to load:', event);
    event.target.style.display = 'none';
  }

  // ---- Kwitansi (receipt) helpers ----

  hasReceipt(): boolean {
    return this.isCompleted() && !!this.receipt;
  }

  isReceiptLoading(): boolean {
    return this.receiptLoading;
  }

  getReceiptUrl(): string {
    if (!this.receipt) return '';
    const baseUrl = environment.apiUrl.replace('/api/v1', '');
    return `${baseUrl}${this.receipt.filePath}`;
  }

  getReceiptFileName(): string {
    return this.receipt?.fileName || 'Kwitansi.pdf';
  }

  /**
   * Manually retry loading the kwitansi (e.g. when it wasn't ready right after verify)
   */
  loadReceiptManually(): void {
    if (this.payment) {
      this.loadReceipt(this.payment.id);
    }
  }

  downloadReceipt(): void {
    if (this.receipt) {
      window.open(this.getReceiptUrl(), '_blank');
    } else {
      this.toastService.error('Kwitansi belum tersedia');
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount?: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
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
    return this.PAYMENT_STATUS_COLORS[this.payment.status] || 'medium';
  }

  /**
   * Get method label
   */
  getMethodLabel(): string {
    if (!this.payment) return '-';
    return this.PAYMENT_METHOD_LABELS[this.payment.paymentMethod] || this.payment.paymentMethod;
  }

  /**
   * Get method color
   */
  getMethodColor(): string {
    if (!this.payment) return 'medium';
    return this.PAYMENT_METHOD_COLORS[this.payment.paymentMethod] || 'medium';
  }

  /**
   * Get resident name
   */
  getResidentName(): string {
    if (!this.payment?.resident) return '-';
    return `${this.payment.resident.firstName} ${this.payment.resident.lastName}`;
  }

  /**
   * Get resident phone
   */
  getResidentPhone(): string {
    return this.payment?.resident?.phoneNumber || '-';
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
   * Get invoice number
   */
  getInvoiceNumber(): string {
    return this.payment?.invoice?.invoiceNumber || '-';
  }

  /**
   * Check if payment method requires bank info
   */
  hasBankInfo(): boolean {
    return !!(this.payment?.bankName || this.payment?.accountNumber || this.payment?.paymentChannel);
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
