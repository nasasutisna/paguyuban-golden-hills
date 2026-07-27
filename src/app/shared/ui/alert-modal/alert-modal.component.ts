import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';

/**
 * Alert modal type — drives the icon and accent color.
 */
export type AlertModalType = 'success' | 'info' | 'warning' | 'error';

/**
 * A key/value row rendered in the alert body.
 * - `normal` — plain row
 * - `strong` — bold value
 * - `total` — bold value with a divider above and accent color
 *   (use once, for totals / grand totals)
 */
export interface AlertModalRow {
  label: string;
  value: string;
  emphasis?: 'normal' | 'strong' | 'total';
}

/**
 * Action button rendered in the alert footer. `value` is returned to the
 * caller via `AlertModalService.open()` when the button is clicked; if omitted
 * it falls back to `role`, then `text`.
 */
export interface AlertModalButton {
  text: string;
  role?: 'cancel' | 'confirm' | 'destructive';
  variant?: 'solid' | 'outline' | 'clear';
  icon?: string;
  value?: any;
}

/**
 * Reusable alert modal.
 *
 * A modal-based alternative to Ionic's `AlertController` for cases that need
 * rich content — a type icon, optional highlighted value, and structured
 * key/value rows. `AlertController` cannot render arbitrary HTML/components in
 * its message, so this component fills that gap.
 *
 * Present via `AlertModalService.open(...)` (or `ModalController` directly).
 * Dismisses with the clicked button's `value` (or `role` / `text`); backdrop
 * or close-button dismiss yields `undefined`.
 */
@Component({
  selector: 'app-alert-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './alert-modal.component.html',
  styleUrls: ['./alert-modal.component.scss'],
})
export class AlertModalComponent {
  private modalController = inject(ModalController);

  @Input() type: AlertModalType = 'info';
  @Input() title = '';
  @Input() message = '';
  @Input() highlight: { label: string; value: string } | null = null;
  @Input() rows: AlertModalRow[] = [];
  @Input() buttons: AlertModalButton[] = [
    { text: 'OK', role: 'confirm', variant: 'solid' },
  ];

  /** Per-type icon + Ionic color used for the icon and button accents. */
  private readonly TYPE_META: Record<AlertModalType, { icon: string; color: string }> = {
    success: { icon: 'checkmark-circle', color: 'success' },
    info: { icon: 'information-circle', color: 'primary' },
    warning: { icon: 'warning', color: 'warning' },
    error: { icon: 'close-circle', color: 'danger' },
  };

  get meta(): { icon: string; color: string } {
    return this.TYPE_META[this.type] ?? this.TYPE_META['info'];
  }

  /**
   * Ionic color for a button. Solid confirm buttons pick up the alert's accent
   * color so a success modal gets a green primary action, an error modal a red
   * one, etc. `destructive` always forces danger.
   */
  buttonColor(button: AlertModalButton): string {
    if (button.role === 'destructive') return 'danger';
    if (button.variant === 'outline' || button.variant === 'clear') return 'medium';
    return this.meta.color;
  }

  buttonFill(button: AlertModalButton): 'solid' | 'outline' | 'clear' {
    return button.variant === 'outline' ? 'outline' : button.variant === 'clear' ? 'clear' : 'solid';
  }

  onButton(button: AlertModalButton): void {
    const result = button.value !== undefined ? button.value : (button.role ?? button.text);
    this.modalController.dismiss(result);
  }

  close(): void {
    this.modalController.dismiss(undefined);
  }
}
