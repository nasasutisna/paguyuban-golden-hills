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

type Step = 'request' | 'complete';

/**
 * Register Page — WhatsApp OTP flow (mirrors forgot-password).
 *
 * Step 1: user enters their house unit + registered WhatsApp number → backend
 *   verifies against a resident; if the unit already has an account it returns
 *   409 "akun sudah terdaftar", otherwise it sends a 6-digit OTP and returns a
 *   `registerToken`.
 * Step 2: user enters the OTP + a new password → backend verifies, creates the
 *   account (identity auto-derived from the resident), links the resident and
 *   returns auth tokens → auto-login to /dashboard.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss']
})
export class RegisterPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  requestForm!: FormGroup;
  completeForm!: FormGroup;

  step: Step = 'request';
  isSubmitting = false;
  registerToken = '';
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

    this.completeForm = this.fb.group(
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
    this.pwdChanges = this.completeForm
      .get('newPassword')!
      .valueChanges.subscribe(() => {
        this.completeForm.get('confirmPassword')?.updateValueAndValidity({
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

  get fCmp(): { [key: string]: AbstractControl } {
    return this.completeForm.controls;
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

  isCompleteValid(): boolean {
    return this.completeForm.valid && !this.isSubmitting;
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
        .requestRegistration(unitNumber, phoneNumber)
        .subscribe({
          next: (data) => {
            this.loadingService.dismiss();
            this.isSubmitting = false;
            this.registerToken = data.registerToken;
            this.maskedPhone = data.maskedPhone;
            this.step = 'complete';
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

  /** Step 2 — verify OTP, create the account & auto-login. */
  async onComplete(): Promise<void> {
    if (!this.isCompleteValid()) {
      this.completeForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const { otp, newPassword } = this.completeForm.value;

    try {
      await this.loadingService.show({ message: 'Membuat akun...' });
      this.authService
        .completeRegistration(this.registerToken, otp, newPassword)
        .subscribe({
          next: () => {
            this.loadingService.dismiss();
            this.isSubmitting = false;
            this.toastService.success(
              'Registrasi berhasil! Selamat datang di Golden Hills.'
            );
            this.router.navigateByUrl('/dashboard');
          },
          error: (error) => {
            this.loadingService.dismiss();
            this.isSubmitting = false;
            const msg =
              error?.error?.message || 'Gagal membuat akun. Coba lagi.';
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
