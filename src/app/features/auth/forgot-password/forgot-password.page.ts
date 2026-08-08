import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import {
  getErrorMessage,
  REGEX_PATTERNS,
  matchFields,
  strongPassword
} from '@validators/validators';

type Step = 'request' | 'reset';

/**
 * Forgot Password Page — WhatsApp OTP flow.
 *
 * Step 1: user enters their house unit + registered WhatsApp number → backend
 *   sends a 6-digit OTP to that number and returns a `resetToken`.
 * Step 2: user enters the OTP + a new password → backend verifies & resets.
 *
 * The request endpoint always responds 200 (to prevent enumeration), so the UI
 * moves to step 2 regardless and shows the masked-phone hint.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss']
})
export class ForgotPasswordPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  requestForm!: FormGroup;
  resetForm!: FormGroup;

  step: Step = 'request';
  isSubmitting = false;
  resetToken = '';
  maskedPhone = '';

  // Input focus state (for input-wrapper styling).
  unitFocused = false;
  phoneFocused = false;
  otpFocused = false;
  newPwdFocused = false;
  confirmPwdFocused = false;
  showNewPassword = false;
  showConfirmPassword = false;

  private pwdChanges?: Subscription;

  ngOnInit(): void {
    this.requestForm = this.fb.group({
      unitNumber: ['', [Validators.required]],
      phoneNumber: [
        '',
        [Validators.required, Validators.pattern(REGEX_PATTERNS.PHONE)]
      ]
    });

    this.resetForm = this.fb.group(
      {
        otp: [
          '',
          [Validators.required, Validators.pattern(/^\d{6}$/)]
        ],
        newPassword: ['', [Validators.required, strongPassword()]],
        confirmPassword: [
          '',
          [Validators.required, matchFields('newPassword', 'confirmPassword')]
        ]
      },
      { validators: matchFields('newPassword', 'confirmPassword') }
    );

    // Keep the confirm-password error fresh as the new password changes.
    this.pwdChanges = this.resetForm
      .get('newPassword')!
      .valueChanges.subscribe(() => {
        this.resetForm.get('confirmPassword')?.updateValueAndValidity({
          onlySelf: true,
          emitEvent: false
        });
      });
  }

  ngOnDestroy(): void {
    this.pwdChanges?.unsubscribe();
  }

  get fReq(): { [key: string]: AbstractControl } {
    return this.requestForm.controls;
  }

  get fReset(): { [key: string]: AbstractControl } {
    return this.resetForm.controls;
  }

  fieldError(form: FormGroup, name: string, label: string): string {
    const control = form.get(name);
    if (!control || !control.errors || !control.touched) {
      return '';
    }
    return getErrorMessage(control.errors, label);
  }

  isRequestValid(): boolean {
    return this.requestForm.valid && !this.isSubmitting;
  }

  isResetValid(): boolean {
    return this.resetForm.valid && !this.isSubmitting;
  }

  /** Step 1 — request the OTP. */
  async onRequest(): Promise<void> {
    if (!this.isRequestValid()) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const unitNumber = this.requestForm.value.unitNumber.trim();
    const phoneNumber = this.requestForm.value.phoneNumber.trim();

    try {
      await this.loadingService.show({ message: 'Mengirim kode...' });
      this.authService
        .requestPasswordReset(unitNumber, phoneNumber)
        .subscribe({
          next: (data) => {
            this.loadingService.dismiss();
            this.isSubmitting = false;
            this.resetToken = data.resetToken;
            this.maskedPhone = data.maskedPhone;
            this.step = 'reset';
          },
          error: (error) => {
            this.loadingService.dismiss();
            this.isSubmitting = false;
            const msg =
              error?.error?.message || 'Gagal mengirim kode. Coba lagi.';
            this.toastService.error(msg);
          }
        });
    } catch {
      this.loadingService.dismiss();
      this.isSubmitting = false;
      this.toastService.error('Terjadi kesalahan.');
    }
  }

  /** Step 2 — verify OTP and set the new password. */
  async onReset(): Promise<void> {
    if (!this.isResetValid()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const { otp, newPassword } = this.resetForm.value;

    try {
      await this.loadingService.show({ message: 'Meriset password...' });
      this.authService
        .resetPassword(this.resetToken, otp, newPassword)
        .subscribe({
          next: () => {
            this.loadingService.dismiss();
            this.isSubmitting = false;
            this.toastService.success(
              'Password berhasil direset. Silakan login.'
            );
            this.router.navigateByUrl('/auth/login');
          },
          error: (error) => {
            this.loadingService.dismiss();
            this.isSubmitting = false;
            const msg =
              error?.error?.message || 'Gagal mereset password. Coba lagi.';
            this.toastService.error(msg);
          }
        });
    } catch {
      this.loadingService.dismiss();
      this.isSubmitting = false;
      this.toastService.error('Terjadi kesalahan.');
    }
  }

  /** Resend the OTP — go back to step 1 prefilled and submit again. */
  async onResend(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }
    this.step = 'request';
    // Keep the same unit/phone so the user just hits "Kirim Kode" again.
  }

  goToLogin(): void {
    this.router.navigateByUrl('/auth/login');
  }
}
