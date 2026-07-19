import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { IplPeriodsService } from '../ipl-periods.service';
import {
  IplPeriodStatus,
  GenerateIplPeriodsDto,
} from '../ipl-payments.model';
import { SelectOption } from '@shared/ui/form-controls/form.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  FormInputComponent,
  FormSelectComponent,
  FormButtonComponent,
} from '@shared/ui/form-controls';

/**
 * IPL Period Generate Page
 * Admin page to generate all 12 monthly periods (Jan-Dec) for a chosen year in one action.
 */
@Component({
  selector: 'app-ipl-period-generate',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormInputComponent,
    FormSelectComponent,
    FormButtonComponent,
  ],
  templateUrl: './ipl-period-generate.page.html',
})
export class IplPeriodGeneratePage implements OnDestroy {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private iplPeriodsService = inject(IplPeriodsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  form: FormGroup;
  loading = false;

  readonly statusOptions: SelectOption[] = [
    { value: IplPeriodStatus.DRAFT, label: 'Draft' },
    { value: IplPeriodStatus.ACTIVE, label: 'Aktif' },
    { value: IplPeriodStatus.CLOSED, label: 'Tutup' },
  ];

  private subscriptions: Subscription[] = [];

  constructor() {
    this.form = this.fb.group({
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2100)]],
      baseRate: [2500, [Validators.required, Validators.min(0)]],
      status: [IplPeriodStatus.ACTIVE, Validators.required],
      dueDay: [10, [Validators.min(1), Validators.max(31)]],
    });
  }

  /**
   * Submit form -> generate 12 periods
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    const formValue = this.form.value;
    const dto: GenerateIplPeriodsDto = {
      year: Number(formValue.year),
      baseRate: Number(formValue.baseRate),
      status: formValue.status,
    };
    // Only send dueDay when provided & valid — omit to leave dueDate empty.
    if (formValue.dueDay !== null && formValue.dueDay !== '' && formValue.dueDay !== undefined) {
      dto.dueDay = Number(formValue.dueDay);
    }

    this.loading = true;
    this.loadingService.show({ message: 'Men-generate 12 periode...' });

    this.subscriptions.push(
      this.iplPeriodsService.generateYear(dto).subscribe({
        next: (result) => {
          this.loading = false;
          this.loadingService.dismiss();

          if (!result) {
            this.toastService.error('Gagal generate periode');
            return;
          }

          if (result.skipped > 0 && result.created > 0) {
            this.toastService.warning(
              `${result.created} periode dibuat, ${result.skipped} dilewati (sudah ada)`,
            );
          } else if (result.skipped > 0 && result.created === 0) {
            this.toastService.warning(
              `Semua 12 periode sudah ada untuk tahun ${dto.year} — tidak ada yang dibuat`,
            );
          } else {
            this.toastService.success(`${result.created} periode berhasil dibuat`);
          }

          this.router.navigate(['/admin/ipl-periods']);
        },
        error: (error) => {
          this.loading = false;
          this.loadingService.dismiss();
          this.toastService.error('Gagal generate periode');
          console.error('Generate periods error:', error);
        },
      }),
    );
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/ipl-periods']);
  }

  /**
   * Format currency (IDR)
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }

  /**
   * Check if a field is invalid (for shared form components)
   */
  isFieldInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  /**
   * Get error message for a field
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

    return 'Input tidak valid';
  }

  isFormValid(): boolean {
    return this.form.valid;
  }

  get selectedStatusLabel(): string {
    const statusValue = this.form.get('status')?.value;
    const option = this.statusOptions.find((s) => s.value === statusValue);
    return option?.label || '-';
  }

  get dueDayValue(): number | null {
    const v = this.form.get('dueDay')?.value;
    return v !== null && v !== '' && v !== undefined ? Number(v) : null;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
