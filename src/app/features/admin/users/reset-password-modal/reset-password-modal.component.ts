import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { UsersService } from '../users.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { User, PasswordDeliveryResult, PasswordMode } from '../users.model';

/**
 * Modal to set / reset a user's password.
 * Supports manual entry or auto-generated strong password, with optional
 * WhatsApp delivery. Displays the generated password so the admin can copy it.
 */
@Component({
  selector: 'app-reset-password-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './reset-password-modal.component.html',
  styleUrls: ['./reset-password-modal.component.scss'],
})
export class ResetPasswordModalComponent {
  @Input({ required: true }) user!: User;

  private modalController = inject(ModalController);
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  form: FormGroup = this.fb.group({
    passwordMode: ['generate' as PasswordMode, [Validators.required]],
    password: ['', [Validators.minLength(8)]],
    sendViaWhatsapp: [true],
  });

  submitting = false;
  result: PasswordDeliveryResult | null = null;

  get mode(): PasswordMode {
    return this.form.value.passwordMode;
  }

  get isManualInvalid(): boolean {
    const c = this.form.get('password');
    return this.mode === 'manual' && !!c && c.invalid && c.touched;
  }

  /** Phone preview for the WA hint */
  get phonePreview(): string {
    return this.user.resident?.phoneNumber || this.user.phoneNumber || '(tidak ada)';
  }

  onModeChange(): void {
    // Clear manual password errors when switching to generate
    if (this.mode === 'generate') {
      this.form.get('password')?.reset('');
    }
  }

  async submit(): Promise<void> {
    if (this.mode === 'manual') {
      const pw = this.form.get('password');
      if (pw?.invalid) {
        pw.markAsTouched();
        return;
      }
    }

    this.submitting = true;
    await this.loadingService.show({ message: 'Memperbarui password...' });

    const dto = {
      passwordMode: this.mode,
      ...(this.mode === 'manual' ? { password: this.form.value.password } : {}),
      sendViaWhatsapp: !!this.form.value.sendViaWhatsapp,
    };

    this.usersService.resetPassword(this.user.id, dto).subscribe({
      next: (res) => {
        this.loadingService.dismiss();
        this.submitting = false;
        this.result = res;
        if (res.whatsappSent) {
          this.toastService.success('Password diperbarui & dikirim via WhatsApp');
        } else if (this.form.value.sendViaWhatsapp && res.whatsappError) {
          this.toastService.warning(`Password diperbarui, WA gagal: ${res.whatsappError}`);
        } else {
          this.toastService.success('Password diperbarui');
        }
      },
      error: (error) => {
        this.loadingService.dismiss();
        this.submitting = false;
        this.toastService.error('Gagal memperbarui password');
        console.error('Reset password error:', error);
      },
    });
  }

  async copyPassword(): Promise<void> {
    if (!this.result?.generatedPassword) return;
    try {
      await navigator.clipboard.writeText(this.result.generatedPassword);
      this.toastService.success('Password disalin ke clipboard');
    } catch {
      this.toastService.error('Gagal menyalin password');
    }
  }

  close(): void {
    this.modalController.dismiss(this.result);
  }
}
