import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subscription, combineLatest } from 'rxjs';
import { ResidentInvoicesService } from '../resident-invoices/resident-invoices.service';
import { FeeTypesService } from '../fee-types/fee-types.service';
import { ResidentsService } from '../residents/residents.service';
import {
  ResidentInvoice,
  CreateResidentInvoiceDto,
  UpdateResidentInvoiceDto,
  InvoiceStatus
} from '../resident-invoices/resident-invoices.model';
import { FeeType } from '../fee-types/fee-types.model';
import { Resident } from '../residents/residents.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  FormDatePickerComponent,
  FormSelectComponent,
  FormInputComponent,
  FormTextareaComponent,
  FormButtonComponent,
  SelectOption
} from '@shared/ui/form-controls';

/**
 * Resident Invoice Form Page
 * Create or edit resident invoice (tagihan warga)
 */
@Component({
  selector: 'app-resident-invoice-form',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormDatePickerComponent,
    FormSelectComponent,
    FormInputComponent,
    FormTextareaComponent,
    FormButtonComponent
  ],
  templateUrl: './resident-invoice-form.page.html',
  styleUrls: ['./resident-invoice-form.page.scss']
})
export class ResidentInvoiceFormPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private residentInvoicesService = inject(ResidentInvoicesService);
  private feeTypesService = inject(FeeTypesService);
  private residentsService = inject(ResidentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  form: FormGroup;
  invoice: ResidentInvoice | null = null;
  isEditMode = false;
  loading = false;
  loadingData = true;
  error: string | null = null;

  residents: Resident[] = [];
  feeTypes: FeeType[] = [];

  private subscriptions: Subscription[] = [];

  constructor() {
    this.form = this.fb.group({
      residentId: ['', Validators.required],
      feeTypeId: ['', Validators.required],
      invoiceDate: [this.formatDateForInput(new Date()), Validators.required],
      dueDate: ['', Validators.required],
      periodStartDate: ['', Validators.required],
      periodEndDate: ['', Validators.required],
      subtotal: [0, [Validators.required, Validators.min(0)]],
      taxAmount: [0, [Validators.min(0)]],
      discountAmount: [0, [Validators.min(0)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.loadInvoice(id);
    }
    // Note: loadingData will be set to false in loadData() callback

    // Update total when amount fields change
    this.form.valueChanges.subscribe(() => {
      this.updateTotalAmount();
    });
  }

  /**
   * Load dropdown data (residents and fee types)
   */
  private loadData(): void {
    combineLatest([
      this.residentsService.getAll({ limit: 1000 }),
      this.feeTypesService.getActive()
    ]).subscribe({
      next:(([residentsData, feeTypes]) => {
        this.residents = residentsData.data || [];
        this.feeTypes = feeTypes || [];
        this.loadingData = false;

        // Show warning if no data
        if (this.residents.length === 0) {
          console.warn('No residents found');
        }
        if (this.feeTypes.length === 0) {
          console.warn('No fee types found');
        }
      }),
      error:(error) => {
        this.residents = [];
        this.feeTypes = [];
        this.error = 'Gagal memuat data';
        this.loadingData = false;
        console.error('Error loading data:', error);
      }
    });
  }

  /**
   * Load invoice for edit
   */
  private loadInvoice(id: string): void {
    this.loading = true;

    this.subscriptions.push(
      this.residentInvoicesService.getById(id).subscribe({
        next: (invoice) => {
          if (invoice) {
            this.invoice = invoice;
            this.patchForm(invoice);
          } else {
            this.error = 'Tagihan tidak ditemukan';
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Gagal memuat tagihan';
          this.loading = false;
          console.error('Error loading invoice:', error);
        }
      })
    );
  }

  /**
   * Patch form with invoice data
   */
  private patchForm(invoice: ResidentInvoice): void {
    this.form.patchValue({
      residentId: invoice.residentId,
      feeTypeId: invoice.feeTypeId,
      invoiceDate: this.formatDateForInput(new Date(invoice.invoiceDate)),
      dueDate: this.formatDateForInput(new Date(invoice.dueDate)),
      periodStartDate: this.formatDateForInput(new Date(invoice.periodStartDate)),
      periodEndDate: this.formatDateForInput(new Date(invoice.periodEndDate)),
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      notes: invoice.notes || ''
    });
  }

  /**
   * Auto-fill default amount when fee type is selected
   */
  onFeeTypeChange(): void {
    const feeTypeId = this.form.get('feeTypeId')?.value;
    const feeType = this.feeTypes.find(ft => ft.id === feeTypeId);

    if (feeType && feeType.defaultAmount) {
      this.form.get('subtotal')?.setValue(feeType.defaultAmount);
    }

    // Auto-set tax rate if applicable
    if (feeType && feeType.isTaxable && feeType.taxRate) {
      const subtotal = this.form.get('subtotal')?.value || 0;
      const taxAmount = (subtotal * feeType.taxRate) / 100;
      this.form.get('taxAmount')?.setValue(Math.round(taxAmount));
    }
  }

  /**
   * Auto-set due date based on period end date
   */
  onPeriodEndDateChange(): void {
    const periodEndDate = this.form.get('periodEndDate')?.value;
    if (periodEndDate && !this.form.get('dueDate')?.value) {
      // Set due date to 7 days after period end
      const endDate = new Date(periodEndDate);
      endDate.setDate(endDate.getDate() + 7);
      this.form.get('dueDate')?.setValue(this.formatDateForInput(endDate));
    }
  }

  /**
   * Update total amount
   */
  private updateTotalAmount(): void {
    // This is for display purposes, total is calculated on backend
  }

  /**
   * Calculate total amount
   */
  get totalAmount(): number {
    const subtotal = this.form.get('subtotal')?.value || 0;
    const taxAmount = this.form.get('taxAmount')?.value || 0;
    const discountAmount = this.form.get('discountAmount')?.value || 0;
    return subtotal + taxAmount - discountAmount;
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

    if (this.isEditMode && this.invoice) {
      this.updateInvoice(this.invoice.id, formValue);
    } else {
      this.createInvoice(formValue);
    }
  }

  /**
   * Create new invoice
   */
  private createInvoice(dto: CreateResidentInvoiceDto): void {
    this.loadingService.show({ message: 'Membuat tagihan...' });

    this.subscriptions.push(
      this.residentInvoicesService.create(dto).subscribe({
        next: (result) => {
          this.loadingService.dismiss();
          if (result) {
            this.toastService.success('Tagihan berhasil dibuat');
            this.router.navigate(['/admin/resident-invoices', result.id]);
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal membuat tagihan');
          console.error('Create invoice error:', error);
        }
      })
    );
  }

  /**
   * Update existing invoice
   */
  private updateInvoice(id: string, dto: UpdateResidentInvoiceDto): void {
    this.loadingService.show({ message: 'Memperbarui tagihan...' });

    this.subscriptions.push(
      this.residentInvoicesService.update(id, dto).subscribe({
        next: (result) => {
          this.loadingService.dismiss();
          if (result) {
            this.toastService.success('Tagihan berhasil diperbarui');
            this.router.navigate(['/admin/resident-invoices', result.id]);
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal memperbarui tagihan');
          console.error('Update invoice error:', error);
        }
      })
    );
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/resident-invoices']);
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
   * Format currency for display
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
   * Check if field is invalid (for standardized form components)
   */
  isFieldInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
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
      return 'Nilai tidak boleh negatif';
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
   * Get submit button text
   */
  get submitButtonText(): string {
    return this.isEditMode ? 'Simpan Perubahan' : 'Buat Tagihan';
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return this.isEditMode ? 'Edit Tagihan' : 'Buat Tagihan';
  }

  /**
   * Get selected resident
   */
  get selectedResident(): Resident | undefined {
    const residentId = this.form.get('residentId')?.value;
    return this.residents.find(r => r.id === residentId);
  }

  /**
   * Get selected fee type
   */
  get selectedFeeType(): FeeType | undefined {
    const feeTypeId = this.form.get('feeTypeId')?.value;
    return this.feeTypes.find(ft => ft.id === feeTypeId);
  }

  /**
   * Convert residents to select options
   */
  get residentOptions(): SelectOption[] {
    return this.residents.map(resident => ({
      value: resident.id,
      label: `${resident.firstName} ${resident.lastName} - ${resident.unitNumber}`
    }));
  }

  /**
   * Convert fee types to select options
   */
  get feeTypeOptions(): SelectOption[] {
    return this.feeTypes.map(feeType => ({
      value: feeType.id,
      label: `${feeType.feeName} - ${this.formatCurrency(feeType.defaultAmount || 0)}`
    }));
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
