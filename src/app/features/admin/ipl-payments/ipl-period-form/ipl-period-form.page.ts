import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { IplPeriodsService } from '../ipl-periods.service';
import {
  IplPeriod,
  CreateIplPeriodDto,
  UpdateIplPeriodDto,
  IplPeriodStatus
} from '../ipl-payments.model';
import { SelectOption } from '@shared/ui/form-controls/form.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  FormInputComponent,
  FormSelectComponent,
  FormDatePickerComponent,
  FormButtonComponent
} from '@shared/ui/form-controls';

/**
 * IPL Period Form Page
 * Admin page to create or edit IPL periods
 */
@Component({
  selector: 'app-ipl-period-form',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule,
    FormInputComponent,
    FormSelectComponent,
    FormDatePickerComponent,
    FormButtonComponent
  ],
  templateUrl: './ipl-period-form.page.html'
})
export class IplPeriodFormPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private iplPeriodsService = inject(IplPeriodsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  form: FormGroup;
  period: IplPeriod | null = null;
  isEditMode = false;
  loading = false;
  loadingData = false;
  error: string | null = null;
  periodId: string | null = null;

  // Month options
  readonly monthOptions: SelectOption[] = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' }
  ];

  // Status options
  readonly statusOptions: SelectOption[] = [
    { value: IplPeriodStatus.DRAFT, label: 'Draft' },
    { value: IplPeriodStatus.ACTIVE, label: 'Aktif' },
    { value: IplPeriodStatus.CLOSED, label: 'Tutup' }
  ];

  private subscriptions: Subscription[] = [];

  constructor() {
    this.form = this.fb.group({
      periodCode: ['', [Validators.required, Validators.maxLength(20)]],
      periodName: ['', [Validators.required, Validators.maxLength(100)]],
      month: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2100)]],
      baseRate: [2500, [Validators.required, Validators.min(0)]],
      status: [IplPeriodStatus.ACTIVE, Validators.required],
      dueDate: ['']
    });
  }

  ngOnInit(): void {
    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.periodId = params['id'];
        this.isEditMode = true;
        if (this.periodId) {
          this.loadPeriod(this.periodId);
        }
      }
    });

    // Auto-generate period code when month/year changes
    this.form.get('month')?.valueChanges.subscribe(() => this.updatePeriodCode());
    this.form.get('year')?.valueChanges.subscribe(() => this.updatePeriodCode());
  }

  /**
   * Load period data for edit mode
   */
  private loadPeriod(id: string): void {
    this.loadingData = true;

    this.subscriptions.push(
      this.iplPeriodsService.getById(id).subscribe({
        next: (period) => {
          if (period) {
            this.period = period;
            this.form.patchValue({
              periodCode: period.periodCode,
              periodName: period.periodName,
              month: period.month,
              year: period.year,
              baseRate: period.baseRate,
              status: period.status,
              dueDate: period.dueDate ? this.formatDateForInput(new Date(period.dueDate)) : ''
            });
          } else {
            this.error = 'Periode tidak ditemukan';
          }
          this.loadingData = false;
        },
        error: (error) => {
          this.error = 'Gagal memuat data periode';
          this.loadingData = false;
          console.error('Error loading period:', error);
        }
      })
    );
  }

  /**
   * Update period code based on month and year
   */
  updatePeriodCode(): void {
    const month = this.form.get('month')?.value;
    const year = this.form.get('year')?.value;

    if (month && year) {
      const monthAbbr = this.getMonthAbbreviation(month);
      const code = `${monthAbbr}-${year}`;
      // Only update if not manually edited (in edit mode, keep existing code)
      if (!this.isEditMode || !this.form.get('periodCode')?.dirty) {
        this.form.get('periodCode')?.setValue(code);
      }
      // Also update period name if not manually edited
      if (!this.isEditMode || !this.form.get('periodName')?.dirty) {
        this.form.get('periodName')?.setValue(`${this.getMonthName(month)} ${year}`);
      }
    }
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

      let formValue = this.form.value;

    // Convert dueDate to ISO string with time 00:00:00
    if (formValue.dueDate) {
      const date = new Date(formValue.dueDate);
      formValue = {
        ...formValue,
        dueDate: new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)).toISOString()
      };
    }

    console.log('formValue', formValue)
    if (this.isEditMode && this.periodId) {
      this.updatePeriod(this.periodId, formValue);
    } else {
      this.createPeriod(formValue);
    }
  }

  /**
   * Create new period
   */
  private createPeriod(dto: CreateIplPeriodDto): void {
    this.loadingService.show({ message: 'Membuat periode...' });

    this.subscriptions.push(
      this.iplPeriodsService.create(dto).subscribe({
        next: (result) => {
          this.loadingService.dismiss();
          if (result) {
            this.toastService.success('Periode berhasil dibuat');
            this.router.navigate(['/admin/ipl-periods']);
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal membuat periode');
          console.error('Create period error:', error);
        }
      })
    );
  }

  /**
   * Update existing period
   */
  private updatePeriod(id: string, formValue: any): void {
    const dto: UpdateIplPeriodDto = {
      periodCode: formValue.periodCode,
      periodName: formValue.periodName,
      month: formValue.month,
      year: formValue.year,
      baseRate: formValue.baseRate,
      status: formValue.status,
      dueDate: formValue.dueDate
    };

    this.loadingService.show({ message: 'Menyimpan periode...' });

    this.subscriptions.push(
      this.iplPeriodsService.update(id, dto).subscribe({
        next: (result) => {
          this.loadingService.dismiss();
          if (result) {
            this.toastService.success('Periode berhasil disimpan');
            this.router.navigate(['/admin/ipl-periods']);
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menyimpan periode');
          console.error('Update period error:', error);
        }
      })
    );
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/ipl-periods']);
  }

  /**
   * Format date for input (YYYY-MM-DD)
   */
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get month abbreviation
   */
  private getMonthAbbreviation(month: number): string {
    const abbreviations = [
      'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN',
      'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'
    ];
    return abbreviations[month - 1] || 'XXX';
  }

  /**
   * Get month name
   */
  private getMonthName(month: number): string {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month - 1] || '-';
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get form control
   */
  get control() {
    return this.form.controls;
  }

  /**
   * Check if control has error
   */
  hasError(controlName: string, errorType?: string): boolean {
    const control = this.form.get(controlName);
    if (!control) return false;
    if (errorType) {
      return control.hasError(errorType) && (control.dirty || control.touched);
    }
    return control.invalid && (control.dirty || control.touched);
  }

  /**
   * Get error message
   */
  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return 'Field ini wajib diisi';
    }
    if (control.errors['min']) {
      return 'Nilai minimal adalah ' + control.errors['min'].min;
    }
    if (control.errors['max']) {
      return 'Nilai maksimal adalah ' + control.errors['max'].max;
    }
    if (control.errors['maxlength']) {
      return 'Maksimal ' + control.errors['maxlength'].requiredLength + ' karakter';
    }

    return 'Input tidak valid';
  }

  /**
   * Check if field is invalid (for standardized form components)
   */
  isFieldInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.form.valid;
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return this.isEditMode ? 'Simpan Perubahan' : 'Buat Periode';
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return this.isEditMode ? 'Edit Periode IPL' : 'Buat Periode IPL Baru';
  }

  /**
   * Get selected month label
   */
  get selectedMonthLabel(): string {
    const monthValue = this.form.get('month')?.value;
    const option = this.monthOptions.find(m => m.value === monthValue);
    return option?.label || '-';
  }

  /**
   * Get selected status label
   */
  get selectedStatusLabel(): string {
    const statusValue = this.form.get('status')?.value;
    const option = this.statusOptions.find(s => s.value === statusValue);
    return option?.label || '-';
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
