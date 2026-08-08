import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subject, Subscription, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SafeUrlPipe } from '@shared/pipes/safe-url.pipe';
import { ToastService } from '@services/toast.service';

import { WhatsappBlastService } from '@features/admin/whatsapp-blast/whatsapp-blast.service';
import {
  WhatsAppStatus,
  WhatsAppBotStatus,
} from '@features/admin/whatsapp-blast/whatsapp-blast.model';

/**
 * WhatsApp Bot Tester Page
 *
 * One-screen convenience for testing & debugging the CS bot: manage the
 * connection (QR pairing), watch the bot status live (is it enabled, is the
 * socket connected, did a resident's message arrive), and send a test message.
 *
 * Connection + send-test logic mirrors WhatsappSettingsPage. The bot-status
 * panel is new and polls /bot/status every few seconds so the admin can see, in
 * real time, the last inbound message the bot received — that is what makes a
 * "silent bot" diagnosable.
 */
@Component({
  selector: 'app-whatsapp-bot-tester',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, SafeUrlPipe],
  templateUrl: './whatsapp-bot-tester.page.html',
  styleUrls: ['./whatsapp-bot-tester.page.scss'],
})
export class WhatsappBotTesterPage implements OnInit, OnDestroy {
  private waService = inject(WhatsappBlastService);
  private toast = inject(ToastService);
  private alertCtrl = inject(AlertController);

  // ---- Connection ----
  status: WhatsAppStatus | null = null;
  statusLoading = false;
  connecting = false;

  // ---- Bot status ----
  botStatus: WhatsAppBotStatus | null = null;
  botLoading = false;

  // ---- Send test ----
  testPhone = '';
  testMessage = '';
  sendingTest = false;

  // ---- Reset pairing (ganti nomor) ----
  resetting = false;

  private subs: Subscription[] = [];
  private destroy$ = new Subject<void>();

  /** Poll interval for the live status refresh. */
  private static readonly POLL_MS = 4000;

  ngOnInit(): void {
    this.refresh();
    // Live polling so lastIncoming/connection update in real time while open.
    this.subs.push(
      timer(WhatsappBotTesterPage.POLL_MS, WhatsappBotTesterPage.POLL_MS)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.refresh()),
    );
  }

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------

  /** Fetch both the connection status and the bot status. */
  private refresh(): void {
    this.loadStatus();
    this.loadBotStatus();
  }

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

  private loadBotStatus(): void {
    this.botLoading = true;
    this.subs.push(
      this.waService.getBotStatus().subscribe({
        next: (b) => {
          this.botStatus = b;
          this.botLoading = false;
        },
        error: () => {
          this.botLoading = false;
        },
      }),
    );
  }

  // ------------------------------------------------------------------
  // Connection
  // ------------------------------------------------------------------

  connect(): void {
    this.connecting = true;
    this.subs.push(
      this.waService.connect().subscribe({
        next: () => {
          this.connecting = false;
          this.toast.info('Memulai koneksi WhatsApp — scan QR jika muncul.');
          this.refresh();
        },
        error: (e) => {
          this.connecting = false;
          this.toast.error(this.errMsg(e) || 'Gagal menghubungkan WhatsApp');
        },
      }),
    );
  }

  async disconnect(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Putuskan Koneksi',
      message:
        'Putuskan sesi WhatsApp? Bisa disambung lagi tanpa scan QR selama kredensial masih tersimpan.',
      buttons: [
        { text: 'Batal', role: 'cancel' },
        { text: 'Putuskan', handler: () => this.doDisconnect() },
      ],
    });
    await alert.present();
  }

  private doDisconnect(): void {
    this.subs.push(
      this.waService.disconnect().subscribe({
        next: () => {
          this.toast.success('Sesi WhatsApp diputus');
          this.refresh();
        },
        error: (e) => this.toast.error(this.errMsg(e) || 'Gagal memutuskan sesi'),
      }),
    );
  }

  /**
   * Switch the paired admin number: wipe the old session (logs out the current
   * number from this app) and issue a fresh QR. Confirmed first because it is
   * destructive — the previously paired number stops receiving here.
   */
  async resetPairing(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Ganti Nomor Admin',
      message:
        'Sesi nomor saat ini akan dihapus (logout dari aplikasi ini) lalu QR baru muncul untuk nomor baru. Lanjut?',
      buttons: [
        { text: 'Batal', role: 'cancel' },
        { text: 'Ya, Ganti', handler: () => this.doResetPairing() },
      ],
    });
    await alert.present();
  }

  private doResetPairing(): void {
    this.resetting = true;
    this.subs.push(
      this.waService.resetPairing().subscribe({
        next: () => {
          this.resetting = false;
          this.toast.info('Sesi direset — scan QR baru dengan nomor admin baru.');
          this.refresh();
        },
        error: (e) => {
          this.resetting = false;
          this.toast.error(this.errMsg(e) || 'Gagal mereset pairing');
        },
      }),
    );
  }

  // ------------------------------------------------------------------
  // Send test
  // ------------------------------------------------------------------

  sendTest(): void {
    if (!this.testPhone?.trim()) {
      this.toast.error('Nomor telepon wajib diisi');
      return;
    }
    this.sendingTest = true;
    this.subs.push(
      this.waService
        .sendTest({
          phoneNumber: this.testPhone.trim(),
          message: this.testMessage?.trim() || undefined,
        })
        .subscribe({
          next: (r) => {
            this.sendingTest = false;
            if (r) this.toast.success(`Pesan uji terkirim ke ${r.to}`);
            else this.toast.error('Gagal mengirim pesan uji');
          },
          error: (e) => {
            this.sendingTest = false;
            this.toast.error(this.errMsg(e) || 'Gagal mengirim pesan uji');
          },
        }),
    );
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

  get botEnabledLabel(): string {
    if (this.botStatus?.enabled) return 'Bot Aktif';
    return 'Bot Mati';
  }

  get botEnabledColor(): string {
    return this.botStatus?.enabled ? 'success' : 'danger';
  }

  /** Phone digits of the last incoming sender, e.g. "62899…". */
  get lastIncomingPhone(): string {
    const jid = this.botStatus?.lastIncoming?.jid ?? '';
    return jid.split('@')[0] || '-';
  }

  /** "14:35" style time for the last incoming message. */
  get lastIncomingTime(): string {
    const at = this.botStatus?.lastIncoming?.at;
    if (!at) return '-';
    return new Date(at).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Extract a human message from an HttpErrorResponse. */
  private errMsg(e: any): string {
    return e?.error?.message || e?.error?.error || e?.message || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subs.forEach((s) => s.unsubscribe());
  }
}
