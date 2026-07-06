import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl
} from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { ApiService } from '@core/api/api.service';
import { getErrorMessage, REGEX_PATTERNS } from '@validators/validators';

/**
 * Forgot Password Request DTO
 */
interface ForgotPasswordRequest {
  email: string;
}

/**
 * Forgot Password Page
 * Handles password reset request via email
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss']
})
export class ForgotPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  forgotPasswordForm: FormGroup;
  isSubmitting = false;
  requestSent = false;
  submittedEmail = '';

  constructor() {
    this.forgotPasswordForm = this.createForgotPasswordForm();
  }

  ngOnInit(): void {}

  /**
   * Create forgot password form with validators
   */
  private createForgotPasswordForm(): FormGroup {
    return this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(REGEX_PATTERNS.EMAIL)
        ]
      ]
    });
  }

  /**
   * Get form controls
   */
  get f(): { [key: string]: AbstractControl } {
    return this.forgotPasswordForm.controls;
  }

  /**
   * Get error message for email field
   */
  getEmailErrorMessage(): string {
    const control = this.forgotPasswordForm.get('email');
    if (!control || !control.errors || !control.touched) {
      return '';
    }
    return getErrorMessage(control.errors, 'Email');
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.forgotPasswordForm.valid && !this.isSubmitting;
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (!this.isFormValid() || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const email = this.forgotPasswordForm.value.email.trim().toLowerCase();

    try {
      await this.loadingService.show({ message: 'Sending reset link...' });

      // Call forgot password API
      // Note: Since this endpoint may not exist in your swagger, you'll need to implement it
      // For now, we'll simulate the call
      this.sendForgotPasswordRequest(email).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.submittedEmail = email;
          this.requestSent = true;
          this.toastService.success('Password reset email sent!');
          this.isSubmitting = false;
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.isSubmitting = false;

          // Show specific error message
          let errorMessage = 'Failed to send reset email';
          if (error.status === 404) {
            errorMessage = 'Email address not found';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          this.toastService.error(errorMessage);
        }
      });
    } catch (error) {
      this.loadingService.dismiss();
      this.isSubmitting = false;
      this.toastService.error('An error occurred');
    }
  }

  /**
   * Send forgot password request to API
   * TODO: Update this with your actual API endpoint when available
   */
  private sendForgotPasswordRequest(email: string): Observable<any> {
    // Simulate API call with timer
    // Replace this with actual API call:
    // return this.apiService.post('/auth/forgot-password', { email });
    return timer(1500).pipe(map(() => ({ success: true })));
  }

  /**
   * Go back to login page
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Resend password reset email
   */
  async onResend(): Promise<void> {
    this.requestSent = false;
    this.forgotPasswordForm.patchValue({ email: this.submittedEmail });
    await this.onSubmit();
  }
}
