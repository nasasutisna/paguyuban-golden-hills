import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription, combineLatest } from 'rxjs';
import { ResidentInvoicesService } from '../resident-invoices/resident-invoices.service';
import { ResidentPaymentsService } from '../resident-payments/resident-payments.service';
import {
  ResidentInvoice,
  InvoiceStatus,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS
} from '../resident-invoices/resident-invoices.model';
import { ResidentPayment } from '../resident-payments/resident-payments.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';

/**
 * Resident Invoice Detail Page
 * Displays invoice details and payment history
 */
@Component({
  selector: 'app-resident-invoice-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './resident-invoice-detail.page.html',
  styleUrls: ['./resident-invoice-detail.page.scss']
})
export class ResidentInvoiceDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private residentInvoicesService = inject(ResidentInvoicesService);
  private residentPaymentsService = inject(ResidentPaymentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  invoice: ResidentInvoice | null = null;
  payments: ResidentPayment[] = [];
  loading = true;
  error: string | null = null;

  // Display labels
  readonly INVOICE_STATUS_LABELS = INVOICE_STATUS_LABELS;
  readonly INVOICE_STATUS_COLORS = INVOICE_STATUS_COLORS;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Load invoice and payment data
   */
  loadData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID Tagihan tidak diberikan';
      this.loading = false;
      return;
    }

    this.loading = true;

    combineLatest([
      this.residentInvoicesService.getById(id),
      this.residentPaymentsService.getByInvoice(id)
    ]).subscribe({
      next: ([invoice, payments]) => {
        this.invoice = invoice;
        this.payments = payments;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Gagal memuat detail tagihan';
        this.loading = false;
        console.error('Error loading invoice detail:', error);
      }
    });
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(): void {
    if (this.invoice) {
      this.router.navigate(['/admin/resident-invoices', this.invoice.id, 'edit']);
    }
  }

  /**
   * Navigate to create payment
   */
  navigateToPayment(): void {
    if (this.invoice) {
      this.router.navigate(['/admin/resident-payments/new'], {
        queryParams: { invoiceId: this.invoice.id }
      });
    }
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/resident-invoices']);
  }

  /**
   * Show delete confirmation
   */
  async confirmDelete(): Promise<void> {
    if (!this.invoice) return;

    const alert = await this.alertController.create({
      header: 'Hapus Tagihan',
      message: `Apakah Anda yakin ingin menghapus tagihan "${this.invoice.invoiceNumber}"? Tindakan ini tidak dapat dibatalkan.`,
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
    if (!this.invoice) return;

    this.loadingService.show({ message: 'Menghapus tagihan...' });

    this.subscriptions.push(
      this.residentInvoicesService.delete(this.invoice.id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Tagihan berhasil dihapus');
          this.router.navigate(['/admin/resident-invoices']);
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus tagihan');
          console.error('Delete invoice error:', error);
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
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Get status color
   */
  getStatusColor(): string {
    if (!this.invoice) return 'medium';
    return this.INVOICE_STATUS_COLORS[this.invoice.status] || 'medium';
  }

  /**
   * Check if invoice is overdue
   */
  isOverdue(): boolean {
    if (!this.invoice) return false;
    if (this.invoice.status === InvoiceStatus.PAID || this.invoice.status === InvoiceStatus.CANCELLED) {
      return false;
    }
    const today = new Date();
    const dueDate = new Date(this.invoice.dueDate);
    return dueDate < today;
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(): number {
    if (!this.invoice || this.invoice.totalAmount === 0) return 0;
    return Math.min(100, (this.invoice.paidAmount / this.invoice.totalAmount) * 100);
  }

  /**
   * Get resident name
   */
  getResidentName(): string {
    if (!this.invoice?.resident) return '-';
    return `${this.invoice.resident.firstName} ${this.invoice.resident.lastName}`;
  }

  /**
   * Get resident address
   */
  getResidentAddress(): string {
    if (!this.invoice?.resident) return '-';
    const block = this.invoice.resident.houseBlock;
    const blockName = block ? block.blockName : '-';
    return `${blockName} - ${this.invoice.resident.unitNumber}`;
  }

  /**
   * Get fee type name
   */
  getFeeTypeName(): string {
    if (!this.invoice?.feeType) return '-';
    return this.invoice.feeType.feeName;
  }

  /**
   * Check if can make payment
   */
  canMakePayment(): boolean {
    if (!this.invoice) return false;
    return this.invoice.status !== InvoiceStatus.PAID &&
           this.invoice.status !== InvoiceStatus.CANCELLED &&
           this.invoice.remainingAmount > 0;
  }

  /**
   * View payment detail
   */
  viewPayment(paymentId: string): void {
    this.router.navigate(['/admin/resident-payments', paymentId]);
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
