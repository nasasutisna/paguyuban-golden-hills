import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { EmployeesService } from '../employees.service';
import { EmployeePositionsService } from '@features/admin/employee-positions/employee-positions.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { getErrorMessage } from '@validators/validators';
import {
  Employee,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmploymentStatus,
  Gender,
  MaritalStatus
} from '../employees.model';
import { EmployeePosition } from '@features/admin/employee-positions/employee-positions.model';

// Form control components
import {
  FormInputComponent,
  FormSelectComponent,
  FormTextareaComponent,
  FormButtonComponent,
  SelectOption,
  FormDatePickerComponent
} from '@shared/ui/form-controls';

/**
 * Employee Form Page
 * Handles both create and edit modes based on route parameter presence
 */
@Component({
  selector: 'app-employee-form',
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
  templateUrl: './employee-form.page.html',
  styleUrls: ['./employee-form.page.scss']
})
export class EmployeeFormPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private employeesService = inject(EmployeesService);
  private employeePositionsService = inject(EmployeePositionsService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  // Form and state
  employeeForm: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  employeeId: string | null = null;

  // Available positions
  positions: EmployeePosition[] = [];

  // Position options for select dropdown
  positionOptions: SelectOption[] = [];

  // Enum options
  genderOptions: SelectOption[] = [
    { value: Gender.MALE, label: 'Laki-laki' },
    { value: Gender.FEMALE, label: 'Perempuan' },
    { value: Gender.OTHER, label: 'Lainnya' }
  ];

  maritalStatusOptions: SelectOption[] = [
    { value: MaritalStatus.SINGLE, label: 'Belum Menikah' },
    { value: MaritalStatus.MARRIED, label: 'Menikah' },
    { value: MaritalStatus.DIVORCED, label: 'Cerai' },
    { value: MaritalStatus.WIDOWED, label: 'Janda/Duda' }
  ];

  employmentStatusOptions: SelectOption[] = [
    { value: EmploymentStatus.ACTIVE, label: 'Aktif' },
    { value: EmploymentStatus.PROBATION, label: 'Masa Percobaan' },
    { value: EmploymentStatus.RESIGNED, label: 'Resign' },
    { value: EmploymentStatus.TERMINATED, label: 'Diberhentikan' }
  ];

  private subscriptions: Subscription[] = [];

  constructor() {
    this.employeeForm = this.initializeForm();
  }

  ngOnInit(): void {
    this.loadPositions();

    // Check if we're in edit mode by checking for :id parameter
    this.subscriptions.push(
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.employeeId = id;
          this.loadEmployee(id);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Initialize form with validators
   */
  private initializeForm(): FormGroup {
    return this.fb.group({
      // Kode karyawan di-generate backend saat create (EMP###).
      // Hanya bisa diisi saat edit.
      employeeCode: [
        '',
        [Validators.maxLength(20)]
      ],
      firstName: [
        '',
        [Validators.required, Validators.maxLength(100)]
      ],
      lastName: [
        '',
        [Validators.required, Validators.maxLength(100)]
      ],
      email: [
        '',
        [Validators.email]
      ],
      phoneNumber: [''],
      alternatePhone: [''],
      identityNumber: [''],
      dateOfBirth: [''],
      gender: [''],
      maritalStatus: [''],
      address: [''],
      city: [''],
      province: [''],
      postalCode: [''],
      emergencyContact: [''],
      emergencyPhone: [''],
      positionId: [
        '',
        [Validators.required]
      ],
      hireDate: [
        '',
        [Validators.required]
      ],
      probationEndDate: [''],
      employmentStatus: [
        EmploymentStatus.ACTIVE,
        [Validators.required]
      ],
      basicSalary: ['', [Validators.min(0)]],
      bankName: [''],
      bankAccountNumber: [''],
      bankAccountName: [''],
      taxId: [''],
      isActive: [true],
      notes: ['']
    });
  }

  /**
   * Load available positions for the dropdown
   */
  private loadPositions(): void {
    this.subscriptions.push(
      this.employeePositionsService.getAll({ limit: 100, sortBy: 'positionName', sortOrder: 'asc' }).subscribe({
        next: (response) => {
          this.positions = response.data || [];
          this.positionOptions = this.positions.map(position => ({
            value: position.id,
            label: position.department
              ? `${position.positionName} - ${position.department} (${position.positionCode})`
              : `${position.positionName} (${position.positionCode})`
          }));
        },
        error: (error) => {
          console.error('Error loading positions:', error);
          this.toastService.error('Gagal memuat data jabatan');
        }
      })
    );
  }

  /**
   * Load existing employee for edit
   */
  private loadEmployee(id: string): void {
    this.loadingService.show({ message: 'Memuat karyawan...' });

    this.subscriptions.push(
      this.employeesService.getById(id).subscribe({
        next: (employee) => {
          this.loadingService.dismiss();
          if (employee) {
            this.populateForm(employee);
          } else {
            this.toastService.error('Karyawan tidak ditemukan');
            this.goBack();
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal memuat karyawan');
          console.error('Load employee error:', error);
          this.goBack();
        }
      })
    );
  }

  /**
   * Populate form with existing data
   */
  private populateForm(employee: Employee): void {
    this.employeeForm.patchValue({
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email || '',
      phoneNumber: employee.phoneNumber || '',
      alternatePhone: employee.alternatePhone || '',
      identityNumber: employee.identityNumber || '',
      dateOfBirth: employee.dateOfBirth || '',
      gender: employee.gender || '',
      maritalStatus: employee.maritalStatus || '',
      address: employee.address || '',
      city: employee.city || '',
      province: employee.province || '',
      postalCode: employee.postalCode || '',
      emergencyContact: employee.emergencyContact || '',
      emergencyPhone: employee.emergencyPhone || '',
      positionId: employee.positionId,
      hireDate: employee.hireDate || '',
      probationEndDate: employee.probationEndDate || '',
      employmentStatus: employee.employmentStatus,
      basicSalary: employee.basicSalary ?? '',
      bankName: employee.bankName || '',
      bankAccountNumber: employee.bankAccountNumber || '',
      bankAccountName: employee.bankAccountName || '',
      taxId: employee.taxId || '',
      isActive: employee.isActive ?? true,
      notes: employee.notes || ''
    });
  }

  /**
   * Get form controls
   */
  get f(): { [key: string]: AbstractControl } {
    return this.employeeForm.controls;
  }

  /**
   * Get error message for a form field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.employeeForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const fieldLabels: { [key: string]: string } = {
      employeeCode: 'Kode karyawan',
      firstName: 'Nama depan',
      lastName: 'Nama belakang',
      email: 'Email',
      phoneNumber: 'Nomor telepon',
      identityNumber: 'Nomor identitas',
      dateOfBirth: 'Tanggal lahir',
      gender: 'Jenis kelamin',
      maritalStatus: 'Status perkawinan',
      address: 'Alamat',
      city: 'Kota',
      province: 'Provinsi',
      postalCode: 'Kode pos',
      emergencyContact: 'Kontak darurat',
      emergencyPhone: 'Telepon darurat',
      positionId: 'Jabatan',
      hireDate: 'Tanggal masuk',
      probationEndDate: 'Akhir masa percobaan',
      employmentStatus: 'Status kepegawaian',
      basicSalary: 'Gaji pokok',
      bankName: 'Nama bank',
      bankAccountNumber: 'Nomor rekening',
      bankAccountName: 'Nama pemilik rekening',
      taxId: 'NPWP',
      notes: 'Catatan'
    };

    return getErrorMessage(control.errors, fieldLabels[fieldName] || fieldName);
  }

  /**
   * Check if a field is invalid and touched
   * Used to show validation errors in form-control components
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.employeeForm.get(fieldName);
    return control ? control.invalid && control.touched : false;
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.employeeForm.valid && !this.isSubmitting;
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.f).forEach((key) => {
        this.f[key].markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.employeeForm.value;

    // Build DTO from form values
    const dto = this.buildDto(formValue);

    try {
      await this.loadingService.show({
        message: this.isEditMode ? 'Menyimpan karyawan...' : 'Membuat karyawan...'
      });

      if (this.isEditMode && this.employeeId) {
        // Update existing
        this.subscriptions.push(
          this.employeesService.update(this.employeeId, dto).subscribe({
            next: () => {
              this.loadingService.dismiss();
              this.toastService.success('Karyawan berhasil disimpan!');
              this.goBack();
            },
            error: (error) => {
              this.loadingService.dismiss();
              this.isSubmitting = false;
              this.toastService.error('Gagal menyimpan karyawan');
              console.error('Update employee error:', error);
            }
          })
        );
      } else {
        // Create new
        this.subscriptions.push(
          this.employeesService.create(dto as CreateEmployeeDto).subscribe({
            next: () => {
              this.loadingService.dismiss();
              this.toastService.success('Karyawan berhasil dibuat!');
              this.goBack();
            },
            error: (error) => {
              this.loadingService.dismiss();
              this.isSubmitting = false;
              this.toastService.error('Gagal membuat karyawan');
              console.error('Create employee error:', error);
            }
          })
        );
      }
    } catch (error) {
      this.loadingService.dismiss();
      this.isSubmitting = false;
      this.toastService.error('Terjadi kesalahan');
      console.error('Submit error:', error);
    }
  }

  /**
   * Build DTO from form values
   */
  private buildDto(formValue: any): CreateEmployeeDto | UpdateEmployeeDto {
    const dto: any = {
      firstName: formValue.firstName?.trim(),
      lastName: formValue.lastName?.trim(),
      positionId: formValue.positionId,
      hireDate: formValue.hireDate ? this.toLocalIsoString(formValue.hireDate) : '',
      employmentStatus: formValue.employmentStatus,
      isActive: formValue.isActive ?? true
    };

    // Kode karyawan hanya dikirim saat edit (di-generate backend saat create)
    if (this.isEditMode && formValue.employeeCode?.trim()) {
      dto.employeeCode = formValue.employeeCode.trim();
    }

    // Optional fields
    if (formValue.email?.trim()) {
      dto.email = formValue.email.trim();
    }
    if (formValue.phoneNumber?.trim()) {
      dto.phoneNumber = formValue.phoneNumber.trim();
    }
    if (formValue.alternatePhone?.trim()) {
      dto.alternatePhone = formValue.alternatePhone.trim();
    }
    if (formValue.identityNumber?.trim()) {
      dto.identityNumber = formValue.identityNumber.trim();
    }
    if (formValue.dateOfBirth) {
      dto.dateOfBirth = this.toLocalIsoString(formValue.dateOfBirth);
    }
    if (formValue.gender) {
      dto.gender = formValue.gender;
    }
    if (formValue.maritalStatus) {
      dto.maritalStatus = formValue.maritalStatus;
    }
    if (formValue.address?.trim()) {
      dto.address = formValue.address.trim();
    }
    if (formValue.city?.trim()) {
      dto.city = formValue.city.trim();
    }
    if (formValue.province?.trim()) {
      dto.province = formValue.province.trim();
    }
    if (formValue.postalCode?.trim()) {
      dto.postalCode = formValue.postalCode.trim();
    }
    if (formValue.emergencyContact?.trim()) {
      dto.emergencyContact = formValue.emergencyContact.trim();
    }
    if (formValue.emergencyPhone?.trim()) {
      dto.emergencyPhone = formValue.emergencyPhone.trim();
    }
    if (formValue.probationEndDate) {
      dto.probationEndDate = this.toLocalIsoString(formValue.probationEndDate);
    }
    if (formValue.basicSalary !== '' && formValue.basicSalary != null) {
      const salary = Number(formValue.basicSalary);
      if (!isNaN(salary)) {
        dto.basicSalary = salary;
      }
    }
    if (formValue.bankName?.trim()) {
      dto.bankName = formValue.bankName.trim();
    }
    if (formValue.bankAccountNumber?.trim()) {
      dto.bankAccountNumber = formValue.bankAccountNumber.trim();
    }
    if (formValue.bankAccountName?.trim()) {
      dto.bankAccountName = formValue.bankAccountName.trim();
    }
    if (formValue.taxId?.trim()) {
      dto.taxId = formValue.taxId.trim();
    }
    if (formValue.notes?.trim()) {
      dto.notes = formValue.notes.trim();
    }

    return dto;
  }

  /**
   * Convert date string to ISO format with time at 00:00:00 (local time)
   * Prevents timezone conversion issues
   */
  private toLocalIsoString(dateValue: string): string {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  /**
   * Navigate back to list
   */
  goBack(): void {
    this.router.navigate(['/admin/employees']);
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return this.isEditMode ? 'Edit Karyawan' : 'Buat Karyawan';
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return this.isEditMode ? 'Simpan' : 'Buat';
  }
}
