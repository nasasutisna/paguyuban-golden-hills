import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { getErrorMessage, REGEX_PATTERNS } from '@validators/validators';
import { User } from '@models/auth.model';

/**
 * Profile Page
 * Displays and allows editing of user profile
 * Also handles logout functionality
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss']
})
export class ProfilePage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private alertController = inject(AlertController);
  private fb = inject(FormBuilder);

  user: User | null = null;
  isEditing = false;
  profileForm: FormGroup;
  isSubmitting = false;

  private authSubscription: Subscription | null = null;

  constructor() {
    this.profileForm = this.createProfileForm();
  }

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.authSubscription = this.authService.authState.subscribe((state) => {
      this.user = state.user;
      if (this.user && !this.isEditing) {
        this.populateForm(this.user);
      }
    });

    // Load current user data
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  /**
   * Create profile form with validators
   */
  private createProfileForm(): FormGroup {
    return this.fb.group({
      username: [
        { value: '', disabled: true },
        [Validators.required, Validators.minLength(3), Validators.maxLength(50)]
      ],
      email: [
        { value: '', disabled: true },
        [Validators.required, Validators.email, Validators.pattern(REGEX_PATTERNS.EMAIL)]
      ],
      firstName: ['', [Validators.maxLength(100)]],
      role: [{ value: '', disabled: true }]
    });
  }

  /**
   * Populate form with user data
   */
  private populateForm(user: User): void {
    this.profileForm.patchValue({
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      role: this.formatRole(user.roleId)
    });
  }

  /**
   * Format role for display
   */
  formatRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }

  /**
   * Load user profile from API
   */
  private loadUserProfile(): void {
    this.loadingService.show({ message: 'Loading profile...' });

    this.authService.getCurrentUser().subscribe({
      next: () => {
        this.loadingService.dismiss();
      },
      error: (error) => {
        this.loadingService.dismiss();
        this.toastService.error('Failed to load profile');
        console.error('Load profile error:', error);
      }
    });
  }

  /**
   * Get form controls
   */
  get f(): { [key: string]: AbstractControl } {
    return this.profileForm.controls;
  }

  /**
   * Get error message for a form field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.profileForm.get(fieldName);
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
      firstName: 'Full Name',
      email: 'Email',
      username: 'Username'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.profileForm.valid && !this.isSubmitting;
  }

  /**
   * Toggle edit mode
   */
  toggleEditMode(): void {
    if (this.isEditing) {
      // Cancel editing - reset form
      this.isEditing = false;
      if (this.user) {
        this.populateForm(this.user);
      }
    } else {
      // Enable editing
      this.isEditing = true;
      this.profileForm.get('firstName')?.enable();
    }
  }

  /**
   * Save profile changes
   */
  async onSave(): Promise<void> {
    if (!this.isFormValid() || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    const updates = {
      firstName: this.profileForm.value.firstName?.trim() || undefined
    };

    try {
      await this.loadingService.show({ message: 'Saving profile...' });

      this.authService.updateProfile(updates).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Profile updated successfully!');
          this.isEditing = false;
          this.profileForm.get('firstName')?.disable();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.isSubmitting = false;
          this.toastService.error('Failed to update profile');
          console.error('Update profile error:', error);
        }
      });
    } catch (error) {
      this.loadingService.dismiss();
      this.isSubmitting = false;
      this.toastService.error('An error occurred');
    }
  }

  /**
   * Show logout confirmation
   */
  async onLogout(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Logout',
          role: 'destructive',
          handler: () => {
            this.performLogout();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Perform logout
   */
  private performLogout(): void {
    this.loadingService.show({ message: 'Logging out...' });

    this.authService.logout().subscribe({
      next: () => {
        this.loadingService.dismiss();
        this.toastService.info('You have been logged out');
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        this.loadingService.dismiss();
        console.error('Logout error:', error);
        // Navigate to login even on error
        this.router.navigate(['/auth/login']);
      }
    });
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get role badge color
   */
  getRoleColor(role: string): string {
    const colors: { [key: string]: string } = {
      admin: 'danger',
      moderator: 'warning',
      user: 'success'
    };
    return colors[role.toLowerCase()] || 'medium';
  }
}
