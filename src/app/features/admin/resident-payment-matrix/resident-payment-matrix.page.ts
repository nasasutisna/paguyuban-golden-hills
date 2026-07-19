import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { LayoutService } from '@services/layout.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { ResidentPaymentMatrixService } from './resident-payment-matrix.service';
import {
  PaymentMatrixData,
  PaymentMatrixRow,
  MatrixMonthCell,
  HouseBlockOption,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_LONG,
  MONTH_CELL_STATUS_COLORS,
  MONTH_CELL_STATUS_LABELS,
  MONTH_CELL_STATUS_ICONS
} from './resident-payment-matrix.model';

/**
 * Resident Payment (Iuran Warga) Matrix Page
 *
 * Read-only report: per house unit, the monthly Iuran Warga payment status
 * for the selected year (Jan..Dec), plus monthly and yearly totals.
 * Mirrors the IPL payment matrix page.
 */
@Component({
  selector: 'app-resident-payment-matrix',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './resident-payment-matrix.page.html',
  styleUrl: './resident-payment-matrix.page.scss'
})
export class ResidentPaymentMatrixPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private matrixService = inject(ResidentPaymentMatrixService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private layoutService = inject(LayoutService);

  data: PaymentMatrixData | null = null;
  loading = false;

  /** Currently selected year (defaults to the current calendar year). */
  year = new Date().getFullYear();

  /** House blocks available in the filter dropdown. */
  blocks: HouseBlockOption[] = [];
  /** Selected house block id, or null for "all blocks". */
  selectedBlockId: string | null = null;

  /** Short month labels for the table header / mobile grid. */
  readonly monthNames = MONTH_NAMES_SHORT;
  /** Long month labels, used in tooltips / mobile detail. */
  readonly monthNamesLong = MONTH_NAMES_LONG;

  /** Cell status presentation maps (color / label / icon) for the template. */
  readonly statusColors = MONTH_CELL_STATUS_COLORS;
  readonly statusLabels = MONTH_CELL_STATUS_LABELS;
  readonly statusIcons = MONTH_CELL_STATUS_ICONS;

  /** Layout streams drive the desktop-table vs mobile-card switch. */
  readonly isMobile$: Observable<boolean> = this.layoutService.isMobile$;
  readonly isDesktop$: Observable<boolean> = this.layoutService.isDesktop$;

  private subscriptions: Subscription[] = [];

  /** Year filter options: current year and ±1. */
  get yearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear + 1];
  }

  ngOnInit(): void {
    this.loadBlocks();
    this.loadMatrix();
  }

  /**
   * Load the house-block options for the filter dropdown (once).
   */
  loadBlocks(): void {
    this.subscriptions.push(
      this.matrixService.getBlocks().subscribe({
        next: (blocks) => {
          this.blocks = blocks;
        },
        error: (error) => {
          console.error('Error loading house blocks:', error);
        }
      })
    );
  }

  /**
   * Load (or reload) the matrix for the selected year and block.
   */
  loadMatrix(): void {
    this.loading = true;
    this.subscriptions.push(
      this.matrixService.getMatrix(this.year, this.selectedBlockId).subscribe({
        next: (data) => {
          this.data = data;
          this.loading = false;
          this.loadingService.dismiss().catch(() => undefined);
        },
        error: (error) => {
          this.loading = false;
          this.loadingService.dismiss().catch(() => undefined);
          this.toastService.error('Gagal memuat matrix Iuran Warga');
          console.error('Error loading matrix:', error);
        }
      })
    );
  }

  onYearChange(event: CustomEvent): void {
    const value = (event.detail as { value?: number })?.value;
    if (value != null && value !== this.year) {
      this.year = value;
      this.loadMatrix();
    }
  }

  /**
   * Block filter handler. Selecting "all" yields null (no filter); any other
   * option reloads the matrix scoped to that block.
   */
  onBlockChange(event: CustomEvent): void {
    const value = (event.detail as { value?: string | null })?.value;
    const next = value ?? null;
    if (next !== this.selectedBlockId) {
      this.selectedBlockId = next;
      this.loadMatrix();
    }
  }

  /** Total of a given month column (index 0..11), formatted as IDR. */
  monthTotal(i: number): number {
    return this.data?.monthTotals?.[i] ?? 0;
  }

  // ----- Navigation: deep-links from name + month cells -----

  /**
   * Open the resident detail page when the resident name is clicked.
   * No-op when the unit has no resident (e.g. "— Kosong").
   */
  onResidentClick(row: PaymentMatrixRow): void {
    if (!row.residentId) {
      this.toastService.info('Unit ini belum memiliki warga terdaftar');
      return;
    }
    // Nested under the matrix so the breadcrumb keeps the matrix context
    // (mirrors the ipl-payment-matrix/residents/:id pattern).
    this.router.navigate(['/admin/resident-payment-matrix/residents', row.residentId]);
  }

  /**
   * Handle a month-cell click:
   *  - PAID / PENDING (a payment exists) → resident payment detail
   *  - UNPAID                          → payment form, resident pre-selected
   *                                      (when the unit has a primary resident)
   */
  onCellClick(row: PaymentMatrixRow, cell: MatrixMonthCell): void {
    if (cell.paymentId) {
      // Nested under the matrix so the breadcrumb keeps the matrix context.
      this.router.navigate(['/admin/resident-payment-matrix/resident-payments', cell.paymentId]);
      return;
    }

    // No payment yet → open the input form with the resident (if any)
    // pre-selected via query params.
    const queryParams: Record<string, string> = {};
    if (row.residentId) queryParams['residentId'] = row.residentId;
    this.router.navigate(['/admin/resident-payments/new'], { queryParams });
  }

  // ----- Trackers & formatters used by the template -----

  trackByUnit(_index: number, row: PaymentMatrixRow): string {
    return row.unitId;
  }

  trackByMonth(_index: number, cell: MatrixMonthCell): number {
    return cell.month;
  }

  formatCurrency(amount?: number): string {
    if (amount == null) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(amount?: number): string {
    if (amount == null) return '-';
    return new Intl.NumberFormat('id-ID').format(amount);
  }

  formatArea(area?: number): string {
    if (!area) return '-';
    return `${area.toLocaleString('id-ID')} m²`;
  }

  /** Combined block + unit label for compact display. */
  blockLabel(row: PaymentMatrixRow): string {
    const block = row.blockCode ?? row.blockName ?? '';
    return [block, row.unitNumber].filter(Boolean).join(' / ').trim() || row.unitCode;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
