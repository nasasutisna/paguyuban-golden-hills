import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';

// Type-only imports — fully elided at emit, so they don't create a runtime
// module edge back to the component (which would cycle with this root service).
import type {
  AlertModalButton,
  AlertModalRow,
  AlertModalType,
} from '@shared/ui/alert-modal/alert-modal.component';

/**
 * Re-export the public types so callers import everything from this service —
 * they never need to import the component file directly.
 */
export type {
  AlertModalButton,
  AlertModalRow,
  AlertModalType,
} from '@shared/ui/alert-modal/alert-modal.component';

/**
 * Configuration passed to {@link AlertModalService.open}.
 */
export interface AlertModalConfig {
  /** Drives the icon + accent color. Defaults to `info`. */
  type?: AlertModalType;
  title: string;
  /** Optional intro paragraph below the title. */
  message?: string;
  /** Optional prominent boxed value (e.g. a reference number). */
  highlight?: { label: string; value: string } | null;
  /** Optional structured key/value rows. */
  rows?: AlertModalRow[];
  /** Action buttons. Defaults to a single solid `OK` confirm button. */
  buttons?: AlertModalButton[];
  /** Allow backdrop / swipe dismiss. Defaults to `true`. */
  dismissable?: boolean;
}

/**
 * Presents the reusable `AlertModalComponent` as a centered dialog.
 *
 * Use this instead of `AlertController` when you need rich content (icon,
 * highlighted value, structured rows) — `AlertController` does not render
 * arbitrary HTML/components in its message.
 *
 * Resolves with the clicked button's `value` (or its `role` / `text`).
 * Resolves with `undefined` on backdrop / swipe dismiss.
 *
 * The component is loaded with a dynamic `import()` — a `providedIn: 'root'`
 * service statically importing a standalone component triggers Angular's
 * NG0200 circular-dependency detector, so the edge must stay lazy.
 *
 * @example
 * const result = await this.alertModalService.open({
 *   type: 'success',
 *   title: 'Pembayaran Berhasil',
 *   message: 'Pembayaran berhasil dikirim dan menunggu persetujuan',
 *   highlight: { label: 'Nomor Referensi', value: 'REF-001' },
 *   rows: [{ label: 'Total', value: 'Rp 150.000', emphasis: 'total' }],
 *   buttons: [
 *     { text: 'Tambah Lagi', role: 'cancel', variant: 'outline', value: 'add' },
 *     { text: 'Lihat Detail', role: 'confirm', variant: 'solid', value: 'detail' },
 *   ],
 * });
 * if (result === 'detail') { ... }
 */
@Injectable({ providedIn: 'root' })
export class AlertModalService {
  private modalController = inject(ModalController);

  async open(config: AlertModalConfig): Promise<any> {
    const { AlertModalComponent } = await import(
      '@shared/ui/alert-modal/alert-modal.component'
    );

    const modal = await this.modalController.create({
      component: AlertModalComponent,
      cssClass: 'app-alert-modal',
      backdropDismiss: config.dismissable ?? true,
      componentProps: {
        type: config.type ?? 'info',
        title: config.title,
        message: config.message ?? '',
        highlight: config.highlight ?? null,
        rows: config.rows ?? [],
        buttons:
          config.buttons ?? [{ text: 'OK', role: 'confirm', variant: 'solid' }],
      },
    });

    await modal.present();
    const { data } = await modal.onDidDismiss<any>();
    return data;
  }
}
