import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { LayoutService } from '@services/layout.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { AuthService } from '@core/auth/auth.service';
import { downloadBlob } from '@core/utils/download-blob';
import { IplPaymentMatrixService } from './ipl-payment-matrix.service';
import {
  PaymentMatrixData,
  PaymentMatrixRow,
  MatrixMonthCell,
  HouseBlockOption,
  DelinquentReport,
  DelinquentUnit,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_LONG,
  MONTH_CELL_STATUS_COLORS,
  MONTH_CELL_STATUS_LABELS,
  MONTH_CELL_STATUS_ICONS
} from './ipl-payment-matrix.model';

/**
 * IPL Payment Matrix Page
 *
 * Read-only report: per house unit, the monthly IPL payment status for the
 * selected year (Jan..Dec), plus monthly and yearly totals.
 */
@Component({
  selector: 'app-ipl-payment-matrix',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './ipl-payment-matrix.page.html',
  styleUrl: './ipl-payment-matrix.page.scss'
})
export class IplPaymentMatrixPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private matrixService = inject(IplPaymentMatrixService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private layoutService = inject(LayoutService);
  private authService = inject(AuthService);

  data: PaymentMatrixData | null = null;
  loading = false;

  /** Delinquent-units report (menunggak ≥ 3 bln berturut-turut, trailing s/d bulan ini). */
  delinquent: DelinquentReport | null = null;
  delinquentLoading = false;
  /** Controls the delinquent-list modal. */
  showDelinquentModal = false;
  /** True while the PDF export request is in flight. */
  exportingPdf = false;

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
    this.loadDelinquent();
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
          this.toastService.error('Gagal memuat matrix pembayaran IPL');
          console.error('Error loading matrix:', error);
        }
      })
    );
  }

  /**
   * Roles permitted to view the delinquent (menunggak) summary & list.
   * SUPERADMIN is a global bypass (mirrors role.guard.ts / app.component.ts).
   */
  private readonly delinquentViewerRoles = ['ADMIN', 'ACCOUNTANT', 'COORDINATOR'];

  /** Whether the current user may view the delinquent (menunggak) data. */
  get canViewDelinquent(): boolean {
    const role = this.authService.currentUser?.role?.name || '';
    return role === 'SUPERADMIN' || this.delinquentViewerRoles.includes(role);
  }

  /**
   * Load (or reload) the delinquent-units report for the selected year and block.
   * Runs in parallel with the matrix; falls back to an empty report on error.
   * Skipped entirely for roles not allowed to view delinquent data.
   */
  loadDelinquent(): void {
    if (!this.canViewDelinquent) {
      this.delinquent = null;
      this.delinquentLoading = false;
      return;
    }
    this.delinquentLoading = true;
    this.subscriptions.push(
      this.matrixService.getDelinquent(this.year, this.selectedBlockId).subscribe({
        next: (report) => {
          this.delinquent = report;
          this.delinquentLoading = false;
        },
        error: (error) => {
          this.delinquentLoading = false;
          console.error('Error loading delinquent units:', error);
        }
      })
    );
  }

  onYearChange(event: CustomEvent): void {
    const value = (event.detail as { value?: number })?.value;
    if (value != null && value !== this.year) {
      this.year = value;
      this.loadMatrix();
      this.loadDelinquent();
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
      this.loadDelinquent();
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
    // (mirrors the cash-transactions/:idcash/... pattern).
    this.router.navigate(['/admin/ipl-payment-matrix/residents', row.residentId]);
  }

  /**
   * Handle a month-cell click:
   *  - PAID / PENDING (a payment exists)  → payment detail
   *  - UNPAID with a period               → payment form, period pre-selected
   *  - UNPAID without a period            → toast (no IPL period for that month)
   */
  onCellClick(row: PaymentMatrixRow, cell: MatrixMonthCell): void {
    if (cell.paymentId) {
      // Nested under the matrix so the breadcrumb keeps the matrix context
      // (mirrors the cash-transactions/:idcash/ipl-payments/:id pattern).
      this.router.navigate(['/admin/ipl-payment-matrix/ipl-payments', cell.paymentId]);
      return;
    }

    if (!cell.periodId) {
      this.toastService.info(
        `Periode IPL ${this.monthNamesLong[cell.month - 1]} belum tersedia`
      );
      return;
    }

    // No payment yet → open the input form with the period (and resident, if
    // any) pre-selected via query params (see IplPaymentFormPage.loadData).
    const queryParams: Record<string, string> = { periodId: cell.periodId };
    if (row.residentId) queryParams['residentId'] = row.residentId;
    this.router.navigate(['/admin/ipl-payments/new'], { queryParams });
  }

  // ----- Delinquent-units modal + PDF export -----

  /** Clicking the danger chip opens the delinquent-units list modal. */
  onChipClick(): void {
    if (this.delinquent && this.delinquent.count === 0) {
      this.toastService.info('Tidak ada unit menunggak ≥ 3 bulan');
      return;
    }
    this.showDelinquentModal = true;
  }

  closeDelinquentModal(): void {
    this.showDelinquentModal = false;
  }

  /**
   * Navigate to the WhatsApp Blast page, carrying the current year/block so the
   * blast target matches the delinquent list the admin is looking at.
   */
  goToBlast(): void {
    this.closeDelinquentModal();
    this.router.navigate(['/admin/whatsapp-blast'], {
      queryParams: {
        year: this.year,
        ...(this.selectedBlockId ? { houseBlockId: this.selectedBlockId } : {}),
      },
    });
  }

  /**
   * Hit the backend PDF endpoint and trigger a browser download. Filename
   * mirrors the server's `Content-Disposition` so they stay consistent.
   */
  exportDelinquentPdf(): void {
    if (this.exportingPdf) return;
    this.exportingPdf = true;
    this.subscriptions.push(
      this.matrixService
        .downloadDelinquentReport(this.year, this.selectedBlockId)
        .subscribe({
          next: (blob) => {
            const ymd = this.todayYmd();
            const blockSlug = this.selectedBlockId ? `-${this.blockSlug()}` : '';
            downloadBlob(blob, `menunggak-ipl-${this.year}-${ymd}${blockSlug}.pdf`);
            this.exportingPdf = false;
            this.toastService.success('PDF daftar menunggak berhasil diunduh');
          },
          error: (error) => {
            this.exportingPdf = false;
            this.toastService.error('Gagal mengunduh PDF daftar menunggak');
            console.error('Error exporting delinquent PDF:', error);
          }
        })
    );
  }

  /** "Mei – Juli" range label for a delinquent unit's unpaid streak. */
  rangeLabel(unit: DelinquentUnit): string {
    const start = this.monthNamesLong[unit.streakStartMonth - 1];
    const end = this.monthNamesLong[unit.asOfMonth - 1];
    return unit.streakStartMonth === unit.asOfMonth ? end : `${start} – ${end}`;
  }

  /** CSS class for the obligation badge: full / half / zero. */
  obligationClass(label?: string): string {
    if (!label) return 'zero';
    const upper = label.toUpperCase();
    if (upper.startsWith('FULL')) return 'full';
    if (upper.includes('SETENGAH') || upper.includes('%')) return 'half';
    if (upper === '0%' || upper === '0') return 'zero';
    return 'half';
  }

  /** Short chip label, e.g. "Menunggak ≥3 bln (s/d Juli 2026)". */
  delinquentChipLabel(): string {
    const asOf = this.delinquent?.asOfLabel;
    return asOf ? `Menunggak ≥3 bln · s/d ${asOf}` : 'Menunggak ≥3 bln';
  }

  /** Block label for the modal/PDF sub-info. */
  delinquentBlockLabel(): string {
    const first = this.delinquent?.units?.[0];
    if (this.delinquent?.houseBlockId && first) {
      return first.blockCode ?? first.blockName ?? 'Blok terpilih';
    }
    return 'Semua Blok';
  }

  private todayYmd(): string {
    const d = new Date();
    return (
      `${d.getFullYear()}` +
      `${String(d.getMonth() + 1).padStart(2, '0')}` +
      `${String(d.getDate()).padStart(2, '0')}`
    );
  }

  private blockSlug(): string {
    const first = this.delinquent?.units?.[0];
    return (first?.blockCode ?? first?.blockName ?? 'blok')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
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
