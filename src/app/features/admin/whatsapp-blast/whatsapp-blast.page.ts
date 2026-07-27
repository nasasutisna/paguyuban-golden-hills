import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { TableComponent } from '@shared/ui/table/table.component';
import { TableAction, TableConfig, TableDataSource } from '@shared/ui/table/table.model';

import { WhatsappBlastService } from './whatsapp-blast.service';
import {
  WhatsAppStatus,
  DelinquentPreview,
  BlastBatch,
  BlastBatchQueryParams,
  BATCH_STATUS_BADGES,
  RECIPIENT_STATUS_BADGES,
} from './whatsapp-blast.model';

import { IplPaymentMatrixService } from '@features/admin/ipl-payment-matrix/ipl-payment-matrix.service';
import { HouseBlockOption } from '@features/admin/ipl-payment-matrix/ipl-payment-matrix.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { LayoutService } from '@services/layout.service';

/**
 * WhatsApp Blast Page
 * Pair a WhatsApp number (QR), preview delinquent residents + reminder message,
 * run a blast (dry-run first), and review blast history.
 */
@Component({
  selector: 'app-whatsapp-blast',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TableComponent],
  templateUrl: './whatsapp-blast.page.html',
  styleUrls: ['./whatsapp-blast.page.scss'],
})
export class WhatsappBlastPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private waService = inject(WhatsappBlastService);
  private matrixService = inject(IplPaymentMatrixService);
  private loading = inject(LoadingService);
  private toast = inject(ToastService);
  private alertCtrl = inject(AlertController);
  private layout = inject(LayoutService);

  /** Exposed for responsive table/card switching in the template. */
  readonly isMobile$ = this.layout.isMobile$;

  // ---- Connection (read-only status; managed from Pengaturan WhatsApp) ----
  status: WhatsAppStatus | null = null;
  statusLoading = false;

  // ---- Target preview ----
  year = new Date().getFullYear();
  selectedBlockId: string | null = null;
  blocks: HouseBlockOption[] = [];
  preview: DelinquentPreview | null = null;
  previewLoading = false;

  // ---- Blast controls ----
  dryRun = true;
  note = '';
  blasting = false;

  // ---- History ----
  dataSource: TableDataSource<BlastBatch> = { data: [], loading: false };
  tableConfig!: TableConfig;
  statusBadges = BATCH_STATUS_BADGES;
  currentPage = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;

  // ---- Batch detail modal ----
  showDetailModal = false;
  detailLoading = false;
  detailBatch: BlastBatch | null = null;

  readonly recipientBadges = RECIPIENT_STATUS_BADGES;

  private subs: Subscription[] = [];

  /** Year filter options: current year and ±1 (matches matrix page). */
  get yearOptions(): number[] {
    const y = new Date().getFullYear();
    return [y, y - 1, y + 1];
  }

  ngOnInit(): void {
    this.tableConfig = {
      columns: [
        { key: 'batchNo', header: 'No. Batch', type: 'text', sortable: true },
        { key: 'periodLabel', header: 'Periode', type: 'text' },
        { key: 'dryRunLabel', header: 'Jenis', type: 'text' },
        { key: 'summaryLabel', header: 'Terkirim/Total', type: 'text', align: 'right' },
        { key: 'status', header: 'Status', type: 'status', sortable: true },
        { key: 'createdAt', header: 'Dibuat', type: 'date', sortable: true },
      ],
      actions: [
        {
          id: 'view',
          label: 'Detail',
          icon: 'eye-outline',
          color: 'medium',
          handler: (item) => this.openDetail(item.id),
        },
      ],
      sortable: false,
      filterable: false,
      pagination: true,
      pageSize: this.pageSize,
      pageSizeOptions: [10, 25, 50],
      striped: true,
      hoverable: true,
      emptyMessage: 'Belum ada blast',
      loadingMessage: 'Memuat riwayat blast...',
    };

    this.loadBlocks();
    this.loadStatus();
    this.loadBatches();

    // Optional pre-fill from query params (e.g. the "Blast WA" button in the
    // IPL matrix delinquent modal carries the year/block the admin was viewing).
    const qp = this.route.snapshot.queryParamMap;
    const y = qp.get('year');
    const hb = qp.get('houseBlockId');
    if (y) this.year = +y;
    if (hb) this.selectedBlockId = hb;
    if (y || hb) this.loadPreview();
  }

  // ------------------------------------------------------------------
  // Connection (read-only)
  // ------------------------------------------------------------------

  private loadStatus(): void {
    this.statusLoading = true;
    this.subs.push(
      this.waService.getStatus().subscribe({
        next: (s) => {
          this.status = s;
          this.statusLoading = false;
        },
        error: () => {
          this.statusLoading = false;
        },
      }),
    );
  }

  /** Open the dedicated WhatsApp settings page to manage the connection. */
  openSettings(): void {
    this.router.navigate(['/admin/setting-whatsapp']);
  }

  // ------------------------------------------------------------------
  // Target preview
  // ------------------------------------------------------------------

  private loadBlocks(): void {
    this.subs.push(
      this.matrixService.getBlocks().subscribe({
        next: (blocks) => (this.blocks = blocks || []),
        error: (e) => console.error('Error loading blocks:', e),
      }),
    );
  }

  loadPreview(): void {
    this.previewLoading = true;
    this.subs.push(
      this.waService.getDelinquents(this.year, this.selectedBlockId).subscribe({
        next: (p) => {
          this.preview = p;
          this.previewLoading = false;
        },
        error: () => {
          this.previewLoading = false;
          this.toast.error('Gagal memuat daftar menunggak');
        },
      }),
    );
  }

  // ------------------------------------------------------------------
  // Blast
  // ------------------------------------------------------------------

  async runBlast(): Promise<void> {
    if (this.dryRun) {
      this.executeBlast(true);
      return;
    }
    if (!this.status?.connected) {
      this.toast.error('WhatsApp belum terhubung. Sambungkan dulu.');
      return;
    }
    const targetCount = this.preview?.withPhone ?? 0;
    if (targetCount === 0) {
      this.toast.warning('Tidak ada penerima dengan nomor HP valid');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Konfirmasi Blast',
      message: `Kirim <strong>${targetCount}</strong> pesan WhatsApp ke warga menunggak? Pesan akan benar-benar terkirim.`,
      buttons: [
        { text: 'Batal', role: 'cancel' },
        { text: 'Kirim', handler: () => this.executeBlast(false) },
      ],
    });
    await alert.present();
  }

  private executeBlast(dryRun: boolean): void {
    this.blasting = true;
    this.loading.show({ message: dryRun ? 'Menyiapkan simulasi...' : 'Mengirim blast...' });
    this.subs.push(
      this.waService
        .triggerBlast({
          year: this.year,
          houseBlockId: this.selectedBlockId ?? undefined,
          dryRun,
          note: this.note?.trim() || undefined,
        })
        .subscribe({
          next: (r) => {
            this.blasting = false;
            this.loading.dismiss();
            if (!r) {
              this.toast.error('Gagal menjalankan blast');
              return;
            }
            if (r.dryRun) {
              this.toast.success(
                `Simulasi: ${r.totalRecipients} target (${r.skippedCount} tanpa HP). Tidak ada pesan dikirim.`,
              );
            } else {
              this.toast.success(
                `Blast selesai — ${r.successCount} terkirim, ${r.failedCount} gagal, ${r.skippedCount} tanpa HP.`,
              );
            }
            this.loadBatches();
          },
          error: (e) => {
            this.blasting = false;
            this.loading.dismiss();
            this.toast.error(this.errMsg(e) || 'Gagal menjalankan blast');
            console.error(e);
          },
        }),
    );
  }

  // ------------------------------------------------------------------
  // History
  // ------------------------------------------------------------------

  loadBatches(): void {
    this.dataSource = { ...this.dataSource, loading: true };
    const params: BlastBatchQueryParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };
    this.subs.push(
      this.waService.getBatches(params).subscribe({
        next: (response) => {
          this.dataSource = {
            data: response.data.map((b) => this.transformBatch(b)),
            loading: false,
            total: response.total,
            totalPages: response.totalPages,
          };
          this.total = response.total || 0;
          this.totalPages = response.totalPages || 0;
        },
        error: () => {
          this.dataSource = { data: [], loading: false, total: 0 };
        },
      }),
    );
  }

  private transformBatch(b: BlastBatch): any {
    return {
      ...b,
      periodLabel: `${b.year} / bln ${b.asOfMonth}`,
      summaryLabel: `${b.successCount}/${b.totalRecipients}`,
      dryRunLabel: b.dryRun ? 'Simulasi' : 'Nyata',
    };
  }

  onAction(event: { action: TableAction; item: BlastBatch }): void {
    event.action.handler?.(event.item);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadBatches();
  }

  onPageSizeChange(size: any): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadBatches();
  }

  // ------------------------------------------------------------------
  // Batch detail modal
  // ------------------------------------------------------------------

  openDetail(id: string): void {
    this.showDetailModal = true;
    this.detailLoading = true;
    this.detailBatch = null;
    this.subs.push(
      this.waService.getBatch(id).subscribe({
        next: (b) => {
          this.detailBatch = b;
          this.detailLoading = false;
        },
        error: () => {
          this.detailLoading = false;
          this.toast.error('Gagal memuat detail batch');
        },
      }),
    );
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.detailBatch = null;
  }

  // ------------------------------------------------------------------
  // Helpers (template)
  // ------------------------------------------------------------------

  get connStateLabel(): string {
    switch (this.status?.state) {
      case 'OPEN':
        return 'Terhubung';
      case 'QR':
        return 'Menunggu Scan QR';
      case 'CONNECTING':
        return 'Menghubungkan...';
      default:
        return 'Terputus';
    }
  }

  get connStateColor(): string {
    switch (this.status?.state) {
      case 'OPEN':
        return 'success';
      case 'QR':
      case 'CONNECTING':
        return 'warning';
      default:
        return 'medium';
    }
  }

  recipientBadge(status: string): { label: string; color: string; icon: string } {
    return (
      this.recipientBadges.find((b) => b.value === status) || {
        label: status,
        color: 'medium',
        icon: 'alert-circle-outline',
      }
    );
  }

  /** Lookup batch-status label/color for the detail modal header. */
  batchBadge(status?: string | null): { label: string; color: string } {
    const found = BATCH_STATUS_BADGES.find((b) => b.value === status);
    return { label: found?.label || status || '-', color: found?.color || 'medium' };
  }

  formatCurrency(amount: number | null | undefined): string {
    const n = Number(amount ?? 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(n);
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Extract a human message from an HttpErrorResponse. */
  private errMsg(e: any): string {
    return (
      e?.error?.message || e?.error?.error || e?.message || ''
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
