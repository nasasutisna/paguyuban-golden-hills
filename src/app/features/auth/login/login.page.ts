import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { getErrorMessage, REGEX_PATTERNS } from '@validators/validators';
import { LoginRequest } from '@models/auth.model';

/**
 * Login Page
 * Handles user authentication with username and password
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  loginForm: FormGroup;
  showPassword = false;
  usernameFocused = false;
  passwordFocused = false;
  returnUrl: string = '/dashboard';
  private isSubmitting = false;

  constructor() {
    this.loginForm = this.createLoginForm();
  }

  ngOnInit(): void {
    // Load remembered username
    this.loadRememberedUsername();
  }

  /**
   * Create login form with validators
   */
  private createLoginForm(): FormGroup {
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
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
        ]
      ],
      rememberMe: [false]
    });
  }

  /**
   * Custom username validator
   */
  private validateUsername(): Validators {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      // Allow alphanumeric characters and underscores
      const isValid = /^[a-zA-Z0-9_]+$/.test(value);
      return isValid ? null : { pattern: true };
    };
  }

  /**
   * Load remembered username from storage
   */
  private async loadRememberedUsername(): Promise<void> {
    try {
      const rememberedUsername = await this.authService.getRememberedUsername();
      if (rememberedUsername) {
        this.loginForm.patchValue({
          username: rememberedUsername,
          rememberMe: true
        });
      }
    } catch (error) {
      console.error('Error loading remembered username:', error);
    }
  }

  /**
   * Get form controls
   */
  get f(): { [key: string]: AbstractControl } {
    return this.loginForm.controls;
  }

  /**
   * Get error message for a form field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
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
      password: 'Password'
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
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.loginForm.valid && !this.isSubmitting;
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.isFormValid() && !this.isSubmitting) {
      this.isSubmitting = true;

      const request: LoginRequest = {
        username: this.loginForm.value.username.trim(),
        password: this.loginForm.value.password
      };

      const rememberMe = this.loginForm.value.rememberMe;

      try {
        await this.loadingService.show({ message: 'Signing in...' });

        this.authService.login(request, rememberMe).subscribe({
          next: () => {
            this.loadingService.dismiss();
            this.toastService.success('Login successful!');
            this.router.navigateByUrl(this.returnUrl);
            this.isSubmitting = false;
          },
          error: (error) => {
            this.loadingService.dismiss();
            this.isSubmitting = false;

            let errorMessage = 'Login failed';
            if (error.status === 401) {
              errorMessage = 'Invalid username or password';
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            }

            this.toastService.error(errorMessage);
          }
        });
      } catch (error) {
        this.loadingService.dismiss();
        this.isSubmitting = false;
        this.toastService.error('An error occurred during login');
      }
    }
  }

  /**
   * Navigate to forgot password page
   */
  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  /**
   * Navigate to register page
   */
  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}
