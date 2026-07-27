import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SafeUrlPipe } from '@shared/pipes/safe-url.pipe';
import { ToastService } from '@services/toast.service';

import { WhatsappBlastService } from '@features/admin/whatsapp-blast/whatsapp-blast.service';
import { WhatsAppStatus } from '@features/admin/whatsapp-blast/whatsapp-blast.model';

/**
 * WhatsApp Settings Page
 * Dedicated page to manage the WhatsApp connection (QR pairing, connect/
 * disconnect) and send a test message. The connection is shared with the
 * Blast WhatsApp page — pairing here makes it available there too.
 * Mirrors the connection + test-send patterns originally in WhatsappBlastPage.
 */
@Component({
  selector: 'app-whatsapp-settings',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterLink, SafeUrlPipe],
  templateUrl: './whatsapp-settings.page.html',
  styleUrls: ['./whatsapp-settings.page.scss'],
})
export class WhatsappSettingsPage implements OnInit, OnDestroy {
  private waService = inject(WhatsappBlastService);
  private toast = inject(ToastService);
  private alertCtrl = inject(AlertController);

  // ---- Connection ----
  status: WhatsAppStatus | null = null;
  statusLoading = false;
  connecting = false;

  // ---- Send test ----
  testPhone = '';
  testMessage = '';
  sendingTest = false;

  private subs: Subscription[] = [];
  private destroy$ = new Subject<void>();
  private pollSub?: Subscription;

  ngOnInit(): void {
    this.loadStatus();
  }

  // ------------------------------------------------------------------
  // Connection
  // ------------------------------------------------------------------

  private loadStatus(): void {
    this.statusLoading = true;
    this.subs.push(
      this.waService.getStatus().subscribe({
        next: (s) => {
          this.status = s;
          this.statusLoading = false;
          this.syncPolling();
        },
        error: () => {
          this.statusLoading = false;
        },
      }),
    );
  }

  /** Poll status every 3s while not connected; stop once OPEN. */
  private syncPolling(): void {
    const shouldPoll = this.status ? this.status.state !== 'OPEN' : false;
    if (shouldPoll && !this.pollSub) {
      this.pollSub = timer(3000, 3000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.loadStatus());
    } else if (!shouldPoll && this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = undefined;
    }
  }

  connect(): void {
    this.connecting = true;
    this.subs.push(
      this.waService.connect().subscribe({
        next: () => {
          this.connecting = false;
          this.toast.info('Memulai koneksi WhatsApp — scan QR jika muncul.');
          this.loadStatus();
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
          this.loadStatus();
        },
        error: (e) => this.toast.error(this.errMsg(e) || 'Gagal memutuskan sesi'),
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

  /** Extract a human message from an HttpErrorResponse. */
  private errMsg(e: any): string {
    return e?.error?.message || e?.error?.error || e?.message || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pollSub?.unsubscribe();
    this.subs.forEach((s) => s.unsubscribe());
  }
}
