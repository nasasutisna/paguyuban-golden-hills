import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { EmployeeSalaryHeadersService } from '../employee-salary-headers.service';
import { CreateSimplePayrollDto } from '../employee-salary-headers.model';
import { EmployeesService } from '../../employees/employees.service';
import { Employee } from '../../employees/employees.model';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { getErrorMessage } from '@validators/validators';
import {
  FormInputComponent,
  FormSelectComponent,
  FormTextareaComponent,
  FormButtonComponent,
  SelectOption,
  FormDatePickerComponent,
} from '@shared/ui/form-controls';

/**
 * Penggajian sederhana — form gaji datar (1 angka).
 * Submit → backend buat header PAID + posting pengeluaran Kas IPL (kategori GAJI).
 */
@Component({
  selector: 'app-employee-salary-header-form',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormInputComponent,
    FormSelectComponent,
    FormTextareaComponent,
    FormButtonComponent,
    FormDatePickerComponent
  ],
  templateUrl: './employee-salary-header-form.page.html',
  styleUrls: ['./employee-salary-header-form.page.scss'],
})
export class EmployeeSalaryHeaderFormPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private salaryHeadersService = inject(EmployeeSalaryHeadersService);
  private employeesService = inject(EmployeesService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  payrollForm: FormGroup;
  isSubmitting = false;

  employeeOptions: SelectOption[] = [];
  // employeeId -> basicSalary, for the "use basic salary" convenience action.
  private employeeSalaryMap: Record<string, number | undefined> = {};

  private subscriptions: Subscription[] = [];

  constructor() {
    this.payrollForm = this.initializeForm();
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private initializeForm(): FormGroup {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return this.fb.group({
      employeeId: ['', [Validators.required]],
      payPeriod: [currentPeriod, [Validators.required, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)]],
      netSalary: ['', [Validators.required, Validators.min(0)]],
      paymentDate: [now.toISOString(), [Validators.required]],
      notes: ['', [Validators.maxLength(1000)]],
    });
  }

  private loadEmployees(): void {
    this.subscriptions.push(
      this.employeesService.getAll({ limit: 100, sortBy: 'firstName', sortOrder: 'asc' }).subscribe({
        next: (response) => {
          this.employeeSalaryMap = {};
          this.employeeOptions = (response.data || [])
            .filter((e: Employee) => e.isActive !== false)
            .map((e: Employee) => {
              this.employeeSalaryMap[e.id] = e.basicSalary;
              const name = `${e.firstName} ${e.lastName || ''}`.trim();
              return {
                value: e.id,
                label: e.employeeCode ? `${e.employeeCode} — ${name}` : name,
              };
            });
          if (this.employeeOptions.length === 0) {
            this.toastService.warning('Belum ada karyawan. Tambahkan karyawan dahulu di menu Karyawan.');
          }
        },
        error: (error) => {
          console.error('Error loading employees:', error);
          this.employeeOptions = [];
          this.toastService.error('Gagal memuat daftar karyawan');
        },
      }),
    );
  }

  /** Helper text under the employee dropdown: show the basic salary if known. */
  get employeeHelperText(): string {
    const id = this.payrollForm?.get('employeeId')?.value;
    if (!id) return 'Pilih karyawan yang dibayar';
    const salary = this.employeeSalaryMap[id];
    return salary !== undefined
      ? `Gaji pokok: ${this.formatCurrency(salary)}`
      : 'Karyawan ini belum punya gaji pokok';
  }

  get periodHelperText(): string {
    return 'Format YYYY-MM, contoh: 2026-07';
  }

  get amountHelperText(): string {
    return 'Gaji bersih yang dibayar. Akan tercatat sebagai pengeluaran Kas IPL.';
  }

  /** "Use basic salary" convenience button. */
  useBasicSalary(): void {
    const id = this.payrollForm.get('employeeId')?.value;
    const salary = id ? this.employeeSalaryMap[id] : undefined;
    if (salary !== undefined && salary !== null) {
      this.payrollForm.get('netSalary')?.setValue(salary);
    } else {
      this.toastService.warning('Gaji pokok karyawan ini belum diisi');
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  get f(): { [key: string]: AbstractControl } {
    return this.payrollForm.controls;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.payrollForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';
    const fieldLabels: { [key: string]: string } = {
      employeeId: 'Karyawan',
      payPeriod: 'Periode',
      netSalary: 'Jumlah gaji',
      paymentDate: 'Tanggal bayar',
      notes: 'Catatan',
    };
    return getErrorMessage(control.errors, fieldLabels[fieldName] || fieldName);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.payrollForm.get(fieldName);
    return control ? control.invalid && control.touched : false;
  }

  isFormValid(): boolean {
    return this.payrollForm.valid && !this.isSubmitting;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      Object.keys(this.f).forEach((key) => this.f[key].markAsTouched());
      return;
    }

    this.isSubmitting = true;
    const formValue = this.payrollForm.value;

    const dto: CreateSimplePayrollDto = {
      employeeId: formValue.employeeId,
      payPeriod: formValue.payPeriod.trim(),
      netSalary: Number(formValue.netSalary) || 0,
      paymentDate: new Date(formValue.paymentDate).toISOString().slice(0, 10),
    };
    if (formValue.notes?.trim()) {
      dto.notes = formValue.notes.trim();
    }

    try {
      // await this.loadingService.show({ message: 'Menyimpan penggajian...' });
      this.subscriptions.push(
        this.salaryHeadersService.createSimple(dto).subscribe({
          next: () => {
            this.loadingService.dismiss();
            this.toastService.success('Penggajian tersimpan & tercatat di Kas IPL');
            this.goBack();
          },
          error: (error) => {
            this.loadingService.dismiss();
            this.isSubmitting = false;
            const msg = error?.error?.message || 'Gagal menyimpan penggajian';
            this.toastService.error(msg);
            console.error('Create payroll error:', error);
          },
        }),
      );
    } catch (error) {
      this.loadingService.dismiss();
      this.isSubmitting = false;
      this.toastService.error('Terjadi kesalahan');
      console.error('Submit error:', error);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/employee-salary-headers']);
  }

  get pageTitle(): string {
    return 'Bayar Gaji';
  }

  get submitButtonText(): string {
    return 'Simpan & Bayar';
  }
}
