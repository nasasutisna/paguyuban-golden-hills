import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ResidentPaymentsService } from './resident-payments.service';
import {
  ResidentPayment,
  PaymentMethod,
  PaymentStatus,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_COLORS,
  PAYMENT_STATUS_COLORS
} from './resident-payments.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';

/**
 * Resident Payments Page
 * Lists all resident payments (pembayaran warga)
 */
@Component({
  selector: 'app-resident-payments',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './resident-payments.page.html',
  styleUrls: ['./resident-payments.page.scss']
})
export class ResidentPaymentsPage implements OnInit {
  private router = inject(Router);
  private residentPaymentsService = inject(ResidentPaymentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  payments: ResidentPayment[] = [];
  loading = true;
  error: string | null = null;
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 0;
  searchQuery = '';

  // Display labels
  readonly PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;
  readonly PAYMENT_STATUS_LABELS = PAYMENT_STATUS_LABELS;
  readonly PAYMENT_METHOD_COLORS = PAYMENT_METHOD_COLORS;
  readonly PAYMENT_STATUS_COLORS = PAYMENT_STATUS_COLORS;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.loadPayments();
  }

  /**
   * Load payments
   */
  loadPayments(): void {
    this.loading = true;
    this.error = null;

    this.subscriptions.push(
      this.residentPaymentsService.getAll({
        page: this.page,
        limit: this.limit,
        search: this.searchQuery || undefined
      }).subscribe({
        next: (response) => {
          this.payments = response.data;
          this.total = response.total;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Gagal memuat pembayaran';
          this.loading = false;
          console.error('Error loading payments:', error);
        }
      })
    );
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
   * Search payments
   */
  onSearch(event: any): void {
    this.searchQuery = event.target.value;
    this.page = 1;
    this.loadPayments();
  }

  /**
   * Load next page
   */
  loadNext(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadPayments();
    }
  }

  /**
   * Load previous page
   */
  loadPrevious(): void {
    if (this.page > 1) {
      this.page--;
      this.loadPayments();
    }
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
   * Get payment method color
   */
  getPaymentMethodColor(method: PaymentMethod): string {
    return this.PAYMENT_METHOD_COLORS[method] || 'medium';
  }

  /**
   * Get payment status color
   */
  getPaymentStatusColor(status: PaymentStatus): string {
    return this.PAYMENT_STATUS_COLORS[status] || 'medium';
  }

  /**
   * Get resident name
   */
  getResidentName(payment: ResidentPayment): string {
    if (!payment.resident) return '-';
    return `${payment.resident.firstName} ${payment.resident.lastName}`;
  }

  /**
   * Get resident address
   */
  getResidentAddress(payment: ResidentPayment): string {
    if (!payment.resident) return '-';
    const block = payment.resident.houseBlock;
    const blockName = block ? block.blockName : '-';
    return `${blockName} - ${payment.resident.unitNumber}`;
  }

  /**
   * Get invoice number
   */
  getInvoiceNumber(payment: ResidentPayment): string {
    if (!payment.invoice) return '-';
    return payment.invoice.invoiceNumber;
  }

  /**
   * Get completed payments count
   */
  get completedCount(): number {
    return this.payments.filter(p => p.status === PaymentStatus.COMPLETED).length;
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
