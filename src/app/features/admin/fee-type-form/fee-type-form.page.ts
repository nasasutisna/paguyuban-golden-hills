import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { FeeTypesService } from '../fee-types/fee-types.service';
import {
  FeeType,
  FeeCategory,
  RecurringPeriod,
  CreateFeeTypeDto,
  UpdateFeeTypeDto,
  FEE_CATEGORY_LABELS,
  RECURRING_PERIOD_LABELS
} from '../fee-types/fee-types.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';

// Form control components
import {
  FormInputComponent,
  FormSelectComponent,
  FormTextareaComponent,
  FormButtonComponent,
  SelectOption
} from '@shared/ui/form-controls';

/**
 * Fee Type Form Page
 * Create or edit fee type
 */
@Component({
  selector: 'app-fee-type-form',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormInputComponent,
    FormSelectComponent,
    FormTextareaComponent,
    FormButtonComponent
  ],
  templateUrl: './fee-type-form.page.html',
  styleUrls: ['./fee-type-form.page.scss']
})
export class FeeTypeFormPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private feeTypesService = inject(FeeTypesService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  form: FormGroup;
  feeType: FeeType | null = null;
  isEditMode = false;
  loading = false;
  isSubmitting = false;
  error: string | null = null;

  // Display labels
  readonly FEE_CATEGORY_LABELS = FEE_CATEGORY_LABELS;
  readonly RECURRING_PERIOD_LABELS = RECURRING_PERIOD_LABELS;

  // Options for selects
  feeCategoryOptions: SelectOption[] = [
    { value: FeeCategory.MAINTENANCE, label: FEE_CATEGORY_LABELS[FeeCategory.MAINTENANCE] },
    { value: FeeCategory.UTILITIES, label: FEE_CATEGORY_LABELS[FeeCategory.UTILITIES] },
    { value: FeeCategory.SECURITY, label: FEE_CATEGORY_LABELS[FeeCategory.SECURITY] },
    { value: FeeCategory.OTHERS, label: FEE_CATEGORY_LABELS[FeeCategory.OTHERS] }
  ];

  recurrencePeriodOptions: SelectOption[] = [
    { value: RecurringPeriod.MONTHLY, label: RECURRING_PERIOD_LABELS[RecurringPeriod.MONTHLY] },
    { value: RecurringPeriod.QUARTERLY, label: RECURRING_PERIOD_LABELS[RecurringPeriod.QUARTERLY] },
    { value: RecurringPeriod.YEARLY, label: RECURRING_PERIOD_LABELS[RecurringPeriod.YEARLY] }
  ];

  private subscriptions: Subscription[] = [];

  constructor() {
    this.form = this.fb.group({
      feeCode: ['', [Validators.required, Validators.maxLength(20)]],
      feeName: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      feeCategory: [FeeCategory.MAINTENANCE, Validators.required],
      isRecurring: [false],
      recurrencePeriod: [''],
      isTaxable: [false],
      taxRate: [0, [Validators.min(0), Validators.max(100)]],
      defaultAmount: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.loadFeeType(id);
    }
  }

  /**
   * Load fee type for edit
   */
  private loadFeeType(id: string): void {
    this.loading = true;

    this.subscriptions.push(
      this.feeTypesService.getById(id).subscribe({
        next: (feeType) => {
          if (feeType) {
            this.feeType = feeType;
            this.patchForm(feeType);
          } else {
            this.error = 'Jenis iuran tidak ditemukan';
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Gagal memuat jenis iuran';
          this.loading = false;
          console.error('Error loading fee type:', error);
        }
      })
    );
  }

  /**
   * Patch form with fee type data
   */
  private patchForm(feeType: FeeType): void {
    this.form.patchValue({
      feeCode: feeType.feeCode,
      feeName: feeType.feeName,
      description: feeType.description,
      feeCategory: feeType.feeCategory,
      isRecurring: feeType.isRecurring,
      recurrencePeriod: feeType.recurrencePeriod || '',
      isTaxable: feeType.isTaxable,
      taxRate: feeType.taxRate || 0,
      defaultAmount: feeType.defaultAmount || 0,
      isActive: feeType.isActive
    });
  }

  /**
   * Toggle recurring period visibility
   */
  onIsRecurringChange(): void {
    const isRecurring = this.form.get('isRecurring')?.value;
    if (!isRecurring) {
      this.form.get('recurrencePeriod')?.setValue('');
    } else if (!this.form.get('recurrencePeriod')?.value) {
      this.form.get('recurrencePeriod')?.setValue(RecurringPeriod.MONTHLY);
    }
  }

  /**
   * Check if field is invalid
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  /**
   * Get error message for field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return 'Field ini wajib diisi';
    }
    if (control.errors['maxlength']) {
      return `Maksimal ${control.errors['maxlength'].requiredLength} karakter`;
    }
    if (control.errors['min']) {
      return 'Nilai tidak boleh negatif';
    }
    if (control.errors['max']) {
      return `Maksimal ${control.errors['max'].max}`;
    }

    return 'Input tidak valid';
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.form.valid;
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return this.isEditMode ? 'Edit Jenis Iuran' : 'Tambah Jenis Iuran';
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return this.isEditMode ? 'Simpan Perubahan' : 'Buat Jenis Iuran';
  }

  /**
   * Submit form
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    const formValue = this.form.value;

    if (this.isEditMode && this.feeType) {
      this.updateFeeType(this.feeType.id, formValue);
    } else {
      this.createFeeType(formValue);
    }
  }

  /**
   * Create new fee type
   */
  private createFeeType(dto: CreateFeeTypeDto): void {
    this.isSubmitting = true;

    this.subscriptions.push(
      this.feeTypesService.create(dto).subscribe({
        next: (result) => {
          this.isSubmitting = false;
          if (result) {
            this.toastService.success('Jenis iuran berhasil dibuat');
            this.router.navigate(['/admin/fee-types', result.id]);
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          this.toastService.error('Gagal membuat jenis iuran');
          console.error('Create fee type error:', error);
        }
      })
    );
  }

  /**
   * Update existing fee type
   */
  private updateFeeType(id: string, dto: UpdateFeeTypeDto): void {
    this.isSubmitting = true;

    this.subscriptions.push(
      this.feeTypesService.update(id, dto).subscribe({
        next: (result) => {
          this.isSubmitting = false;
          if (result) {
            this.toastService.success('Jenis iuran berhasil diperbarui');
            this.router.navigate(['/admin/fee-types', result.id]);
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          this.toastService.error('Gagal memperbarui jenis iuran');
          console.error('Update fee type error:', error);
        }
      })
    );
  }

  /**
   * Navigate back to list
   */
  goBack(): void {
    this.router.navigate(['/admin/fee-types']);
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
