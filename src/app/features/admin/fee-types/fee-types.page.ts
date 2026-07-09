import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FeeTypesService } from './fee-types.service';
import {
  FeeType,
  FeeCategory,
  FEE_CATEGORY_LABELS,
  FEE_CATEGORY_COLORS
} from './fee-types.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';

/**
 * Fee Types Page
 * Lists all fee types (IPL, utilities, etc.)
 */
@Component({
  selector: 'app-fee-types',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './fee-types.page.html',
  styleUrls: ['./fee-types.page.scss']
})
export class FeeTypesPage implements OnInit {
  private router = inject(Router);
  private feeTypesService = inject(FeeTypesService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  feeTypes: FeeType[] = [];
  loading = true;
  error: string | null = null;
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 0;
  searchQuery = '';

  // Display labels
  readonly FEE_CATEGORY_LABELS = FEE_CATEGORY_LABELS;
  readonly FEE_CATEGORY_COLORS = FEE_CATEGORY_COLORS;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.loadFeeTypes();
  }

  /**
   * Load fee types
   */
  loadFeeTypes(): void {
    this.loading = true;
    this.error = null;

    this.subscriptions.push(
      this.feeTypesService.getAll({
        page: this.page,
        limit: this.limit,
        search: this.searchQuery || undefined
      }).subscribe({
        next: (response) => {
          this.feeTypes = response.data;
          this.total = response.total;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Gagal memuat jenis iuran';
          this.loading = false;
          console.error('Error loading fee types:', error);
        }
      })
    );
  }

  /**
   * Navigate to create page
   */
  navigateToCreate(): void {
    this.router.navigate(['/admin/fee-types/new']);
  }

  /**
   * Navigate to detail page
   */
  navigateToDetail(id: string): void {
    this.router.navigate(['/admin/fee-types', id]);
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(id: string): void {
    this.router.navigate(['/admin/fee-types', id, 'edit']);
  }

  /**
   * Search fee types
   */
  onSearch(event: any): void {
    this.searchQuery = event.target.value;
    this.page = 1;
    this.loadFeeTypes();
  }

  /**
   * Load next page
   */
  loadNext(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadFeeTypes();
    }
  }

  /**
   * Load previous page
   */
  loadPrevious(): void {
    if (this.page > 1) {
      this.page--;
      this.loadFeeTypes();
    }
  }

  /**
   * Confirm delete
   */
  async confirmDelete(feeType: FeeType): Promise<void> {
    const alert = await document.createElement('ion-alert');
    alert.header = 'Hapus Jenis Iuran';
    alert.message = `Apakah Anda yakin ingin menghapus "${feeType.feeName}"?`;
    alert.buttons = [
      {
        text: 'Batal',
        role: 'cancel'
      },
      {
        text: 'Hapus',
        role: 'destructive',
        handler: () => {
          this.handleDelete(feeType.id);
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
    this.loadingService.show({ message: 'Menghapus jenis iuran...' });

    this.subscriptions.push(
      this.feeTypesService.delete(id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Jenis iuran berhasil dihapus');
          this.loadFeeTypes();
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus jenis iuran');
          console.error('Delete fee type error:', error);
        }
      })
    );
  }

  /**
   * Format currency
   */
  formatCurrency(amount?: number): string {
    if (!amount) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get category color
   */
  getCategoryColor(category: FeeCategory): string {
    return this.FEE_CATEGORY_COLORS[category] || 'medium';
  }

  /**
   * Get recurring period text
   */
  getRecurringPeriodText(isRecurring: boolean, period?: string): string {
    if (!isRecurring) return 'Sekali Bayar';
    if (!period) return '-';
    const periodMap: Record<string, string> = {
      MONTHLY: 'Bulanan',
      QUARTERLY: 'Triwulan',
      YEARLY: 'Tahunan'
    };
    return periodMap[period] || period;
  }

  /**
   * Get active status color
   */
  getActiveStatusColor(isActive: boolean): string {
    return isActive ? 'success' : 'medium';
  }

  /**
   * Get active status text
   */
  getActiveStatusText(isActive: boolean): string {
    return isActive ? 'Aktif' : 'Tidak Aktif';
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
