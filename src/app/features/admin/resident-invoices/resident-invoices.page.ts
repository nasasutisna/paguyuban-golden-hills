import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ResidentInvoicesService } from './resident-invoices.service';
import {
  ResidentInvoice,
  InvoiceStatus,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS
} from './resident-invoices.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';

/**
 * Resident Invoices Page
 * Lists all resident invoices (tagihan warga)
 */
@Component({
  selector: 'app-resident-invoices',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './resident-invoices.page.html',
  styleUrls: ['./resident-invoices.page.scss']
})
export class ResidentInvoicesPage implements OnInit {
  private router = inject(Router);
  private residentInvoicesService = inject(ResidentInvoicesService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  invoices: ResidentInvoice[] = [];
  loading = true;
  error: string | null = null;
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 0;
  searchQuery = '';

  // Display labels
  readonly INVOICE_STATUS_LABELS = INVOICE_STATUS_LABELS;
  readonly INVOICE_STATUS_COLORS = INVOICE_STATUS_COLORS;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.loadInvoices();
  }

  /**
   * Load invoices
   */
  loadInvoices(): void {
    this.loading = true;
    this.error = null;

    this.subscriptions.push(
      this.residentInvoicesService.getAll({
        page: this.page,
        limit: this.limit,
        search: this.searchQuery || undefined
      }).subscribe({
        next: (response) => {
          this.invoices = response.data;
          this.total = response.total;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Gagal memuat tagihan';
          this.loading = false;
          console.error('Error loading invoices:', error);
        }
      })
    );
  }

  /**
   * Navigate to create page
   */
  navigateToCreate(): void {
    this.router.navigate(['/admin/resident-invoices/new']);
  }

  /**
   * Navigate to detail page
   */
  navigateToDetail(id: string): void {
    this.router.navigate(['/admin/resident-invoices', id]);
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(id: string): void {
    this.router.navigate(['/admin/resident-invoices', id, 'edit']);
  }

  /**
   * Search invoices
   */
  onSearch(event: any): void {
    this.searchQuery = event.target.value;
    this.page = 1;
    this.loadInvoices();
  }

  /**
   * Load next page
   */
  loadNext(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadInvoices();
    }
  }

  /**
   * Load previous page
   */
  loadPrevious(): void {
    if (this.page > 1) {
      this.page--;
      this.loadInvoices();
    }
  }

  /**
   * Confirm delete
   */
  async confirmDelete(invoice: ResidentInvoice): Promise<void> {
    const alert = await document.createElement('ion-alert');
    alert.header = 'Hapus Tagihan';
    alert.message = `Apakah Anda yakin ingin menghapus tagihan "${invoice.invoiceNumber}"?`;
    alert.buttons = [
      {
        text: 'Batal',
        role: 'cancel'
      },
      {
        text: 'Hapus',
        role: 'destructive',
        handler: () => {
          this.handleDelete(invoice.id);
        }
      }
    ];

    document.body.appendChild(alert);
    await alert.present();
  }

  /**
   * Handle delete
   */
  private handleDelete(id: string): void {
    this.loadingService.show({ message: 'Menghapus tagihan...' });

    this.subscriptions.push(
      this.residentInvoicesService.delete(id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Tagihan berhasil dihapus');
          this.loadInvoices();
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
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Get status color
   */
  getStatusColor(status: InvoiceStatus): string {
    return this.INVOICE_STATUS_COLORS[status] || 'medium';
  }

  /**
   * Check if invoice is overdue
   */
  isOverdue(invoice: ResidentInvoice): boolean {
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      return false;
    }
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    return dueDate < today;
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(invoice: ResidentInvoice): number {
    if (invoice.totalAmount === 0) return 0;
    return Math.min(100, (invoice.paidAmount / invoice.totalAmount) * 100);
  }

  /**
   * Get resident name
   */
  getResidentName(invoice: ResidentInvoice): string {
    if (!invoice.resident) return '-';
    return `${invoice.resident.firstName} ${invoice.resident.lastName}`;
  }

  /**
   * Get resident address
   */
  getResidentAddress(invoice: ResidentInvoice): string {
    if (!invoice.resident) return '-';
    const block = invoice.resident.houseBlock;
    const blockName = block ? block.blockName : '-';
    return `${blockName} - ${invoice.resident.unitNumber}`;
  }

  /**
   * Get fee type name
   */
  getFeeTypeName(invoice: ResidentInvoice): string {
    if (!invoice.feeType) return '-';
    return invoice.feeType.feeName;
  }

  /**
   * Get pending invoices count
   */
  get pendingCount(): number {
    return this.invoices.filter(i => i.status === InvoiceStatus.PENDING).length;
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
