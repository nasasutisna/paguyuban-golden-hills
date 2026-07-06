import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { getErrorMessage, REGEX_PATTERNS, matchFields, strongPassword } from '@validators/validators';
import { RegisterRequest } from '@models/auth.model';

/**
 * Register Page
 * Handles new user registration with validation
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss']
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  usernameFocused = false;
  emailFocused = false;
  firstNameFocused = false;
  lastNameFocused = false;
  phoneNumberFocused = false;
  passwordFocused = false;
  confirmPasswordFocused = false;
  private isSubmitting = false;

  constructor() {
    this.registerForm = this.createRegisterForm();
  }

  /**
   * Create register form with validators
   */
  private createRegisterForm(): FormGroup {
    return this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          this.validateUsername()
        ]
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(REGEX_PATTERNS.EMAIL)
        ]
      ],
      firstName: [
        '',
        [
          Validators.required,
          Validators.maxLength(100)
        ]
      ],
      lastName: [
        '',
        [
          Validators.required,
          Validators.maxLength(100)
        ]
      ],
      phoneNumber: [''],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          strongPassword()
        ]
      ],
      confirmPassword: [
        '',
        [
          Validators.required,
          matchFields('password', 'confirmPassword')
        ]
      ]
    });
  }

  /**
   * Custom username validator - alphanumeric and underscore only
   */
  private validateUsername(): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const isValid = /^[a-zA-Z0-9_]+$/.test(value);
      return isValid ? null : { pattern: true };
    };
  }

  /**
   * Get form controls
   */
  get f(): { [key: string]: AbstractControl } {
    return this.registerForm.controls;
  }

  /**
   * Get error message for a form field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }
    return getErrorMessage(control.errors, this.getFieldLabel(fieldName));
  }

  /**
   * Get user-friendly field label
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      username: 'Username',
      email: 'Email',
      firstName: 'First name',
      lastName: 'Last name',
      phoneNumber: 'Phone number',
      password: 'Password',
      confirmPassword: 'Confirm password'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.registerForm.valid && !this.isSubmitting;
  }

  /**
   * Check if confirm password should show error
   */
  get showConfirmPasswordError(): boolean {
    const confirmPassword = this.registerForm.get('confirmPassword');
    return confirmPassword ? confirmPassword.invalid && confirmPassword.touched : false;
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (!this.isFormValid() || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    const request: RegisterRequest = {
      username: this.registerForm.value.username.trim(),
      email: this.registerForm.value.email.trim().toLowerCase(),
      password: this.registerForm.value.password,
      firstName: this.registerForm.value.firstName.trim(),
      lastName: this.registerForm.value.lastName.trim(),
      phoneNumber: this.registerForm.value.phoneNumber?.trim() || undefined
    };

    try {
      await this.loadingService.show({ message: 'Creating your account...' });

      this.authService.register(request).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Registration successful! Welcome to Golden Hills.');
          this.router.navigate(['/dashboard']);
          this.isSubmitting = false;
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.isSubmitting = false;

          let errorMessage = 'Registration failed';
          if (error.status === 409) {
            errorMessage = 'Username or email already exists';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          this.toastService.error(errorMessage);
        }
      });
    } catch (error) {
      this.loadingService.dismiss();
      this.isSubmitting = false;
      this.toastService.error('An error occurred during registration');
    }
  }

  /**
   * Navigate to login page
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
