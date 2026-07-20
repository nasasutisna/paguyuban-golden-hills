import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CashTransactionsService } from '../cash-transactions.service';
import { ReportStatistics, CategoryBreakdown } from '../cash-transactions.model';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { downloadBlob } from '@core/utils/download-blob';

/**
 * Kegiatan Report Page
 * Displays financial report for Iuran Kegiatan Warga
 * Shows income, expenses, balance, and category breakdown
 */
@Component({
  selector: 'app-kegiatan-report',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ],
  templateUrl: './kegiatan-report.page.html',
  styleUrls: ['./kegiatan-report.page.scss']
})
export class KegiatanReportPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private cashTransactionsService = inject(CashTransactionsService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  // Form for date range filter
  dateForm: FormGroup;

  // Report data
  reportData: ReportStatistics | null = null;
  isLoading = false;

  private subscriptions: Subscription[] = [];

  constructor() {
    // Initialize form with current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.dateForm = this.fb.group({
      startDate: [firstDay.toISOString().split('T')[0]],
      endDate: [lastDay.toISOString().split('T')[0]]
    });
  }

  ngOnInit(): void {
    this.loadReport();

    // Reload report when date range changes
    this.subscriptions.push(
      this.dateForm.valueChanges.subscribe(() => {
        this.loadReport();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Load Kegiatan report data
   */
  private loadReport(): void {
    const { startDate, endDate } = this.dateForm.value;

    this.isLoading = true;
    this.loadingService.show({ message: 'Memuat laporan...' });

    this.subscriptions.push(
      this.cashTransactionsService.getKegiatanReport(startDate, endDate).subscribe({
        next: (data) => {
          this.reportData = data;
          this.isLoading = false;
          this.loadingService.dismiss();
        },
        error: (error) => {
          console.error('Error loading Kegiatan report:', error);
          this.toastService.error('Gagal memuat laporan Kegiatan');
          this.isLoading = false;
          this.loadingService.dismiss();
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
   * Get percentage for category breakdown
   */
  getCategoryPercentage(category: CategoryBreakdown): number {
    if (!this.reportData || this.reportData.totalIncome === 0) {
      return 0;
    }
    return (category.totalAmount / this.reportData.totalIncome) * 100;
  }

  /**
   * Check if report data is available
   */
  hasData(): boolean {
    return this.reportData !== null;
  }

  /**
   * Refresh report
   */
  refresh(): void {
    this.loadReport();
  }

  /**
   * Export report to Excel (.xlsx) and trigger a browser download
   */
  export(): void {
    if (!this.hasData()) {
      this.toastService.info('Tidak ada data untuk diekspor');
      return;
    }

    const { startDate, endDate } = this.dateForm.value;
    this.loadingService.show({ message: 'Mengekspor laporan...' });

    this.subscriptions.push(
      this.cashTransactionsService.exportKegiatanReport(startDate, endDate).subscribe({
        next: (blob) => {
          const filename = `Laporan-Kegiatan_${startDate || ''}_${endDate || ''}.xlsx`;
          downloadBlob(blob, filename);
          this.loadingService.dismiss();
          this.toastService.success('Laporan Kas Warga berhasil diekspor');
        },
        error: (error) => {
          console.error('Error exporting Kegiatan report:', error);
          this.loadingService.dismiss();
          this.toastService.error('Gagal mengekspor laporan Kegiatan');
        }
      })
    );
  }
}
