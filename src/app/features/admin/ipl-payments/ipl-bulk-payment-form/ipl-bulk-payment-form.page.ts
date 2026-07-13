import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { IplPaymentsService } from '../ipl-payments.service';
import { IplPeriodsService } from '../ipl-periods.service';
import { ResidentsService } from '../../residents/residents.service';
import { HouseUnitsService } from '../../house-units/house-units.service';
import {
  IplPeriod,
  IplPaymentMethod,
  IplPayment,
  CreateIplPaymentDto
} from '../ipl-payments.model';
import { SelectOption } from '@shared/ui/form-controls/form.model';
import { Resident } from '../../residents/residents.model';
import { HouseUnit } from '../../house-units/house-units.model';

/**
 * Extended Resident type with house unit data for IPL calculations
 */
interface ResidentWithHouseUnit extends Resident {
  landArea?: number;
  iplPercentage?: number;
  houseUnit?: HouseUnit;
}
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  FormDatePickerComponent,
  FormSelectComponent,
  FormInputComponent,
  FormTextareaComponent,
  FormButtonComponent
} from '@shared/ui/form-controls';

/**
 * IPL Bulk Payment Form Page
 * NOTE: This component is deprecated. Use the main IPL Payment Form with monthCount instead.
 * Multi-month payment support has been added to the main form.
 */
@Component({
  selector: 'app-ipl-bulk-payment-form',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule,
    FormDatePickerComponent,
    FormSelectComponent,
    FormInputComponent,
    FormTextareaComponent,
    FormButtonComponent
  ],
  templateUrl: './ipl-bulk-payment-form.page.html'
})
export class IplBulkPaymentFormPage implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private iplPaymentsService = inject(IplPaymentsService);
  private iplPeriodsService = inject(IplPeriodsService);
  private residentsService = inject(ResidentsService);
  private houseUnitsService = inject(HouseUnitsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  form: FormGroup;
  loading = false;
  loadingData = true;
  error: string | null = null;

  residents: Resident[] = [];
  periods: IplPeriod[] = [];
  houseUnits: HouseUnit[] = [];
  selectedResident: ResidentWithHouseUnit | null = null;
  selectedStartPeriod: IplPeriod | null = null;

  // File upload
  selectedFile: File | null = null;
  filePreview: string | null = null;

  // Payment methods
  readonly PAYMENT_METHODS = Object.values(IplPaymentMethod);

  // Month count options
  readonly MONTH_OPTIONS = [3, 6, 9, 12];

  private subscriptions: Subscription[] = [];

  constructor() {
    this.form = this.fb.group({
      startPeriodId: ['', Validators.required],
      residentId: ['', Validators.required],
      monthCount: [6, [Validators.required, Validators.min(2), Validators.max(24)]],
      paymentDate: [this.formatDateForInput(new Date()), Validators.required],
      paymentMethod: [IplPaymentMethod.TRANSFER, Validators.required],
      referenceNumber: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Redirect to the main form with multi-month support
    this.toastService.info('Silakan gunakan form pembayaran IPL utama dengan opsi multi-bulan');
    this.router.navigate(['/admin/ipl-payments', 'form']);
    return;

    // The code below is disabled since this component is deprecated
    this.loadData();
  }

  /**
   * Load dropdown data (periods, residents, and house units)
   */
  loadData(): void {
    // Load active periods only
    this.subscriptions.push(
      this.iplPeriodsService.getActive().subscribe({
        next: (periods) => {
          this.periods = periods;
          this.loadingData = false;
        },
        error: (error) => {
          this.error = 'Gagal memuat data periode';
          this.loadingData = false;
          console.error('Error loading periods:', error);
        }
      })
    );

    // Load residents
    this.subscriptions.push(
      this.residentsService.getAll({ limit: 1000 }).subscribe({
        next: (residentsData) => {
          this.residents = residentsData.data;
        },
        error: (error) => {
          console.error('Error loading residents:', error);
        }
      })
    );

    // Load house units to get landArea and iplPercentage
    this.subscriptions.push(
      this.houseUnitsService.getAll({ limit: 1000 }).subscribe({
        next: (unitsData) => {
          this.houseUnits = unitsData.data;
        },
        error: (error) => {
          console.error('Error loading house units:', error);
        }
      })
    );
  }

  /**
   * Handle resident selection change
   */
  onResidentChange(): void {
    const residentId = this.form.get('residentId')?.value;
    const resident = this.residents.find(r => r.id === residentId);

    if (resident) {
      // Find the associated house unit for this resident
      const houseUnit = this.houseUnits.find(unit => unit.residents?.some(r => r.id === residentId));

      // Create an enriched resident object with house unit data
      this.selectedResident = {
        ...resident,
        landArea: houseUnit?.landArea,
        iplPercentage: houseUnit?.iplPercentage,
        houseUnit: houseUnit
      };
    } else {
      this.selectedResident = null;
    }
  }

  /**
   * Handle period selection change
   */
  onPeriodChange(): void {
    const periodId = this.form.get('startPeriodId')?.value;
    const period = this.periods.find(p => p.id === periodId);

    if (period) {
      this.selectedStartPeriod = period;
    } else {
      this.selectedStartPeriod = null;
    }
  }

  /**
   * Handle file selection
   */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];

      // Create preview for images
      if (this.selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.filePreview = e.target?.result as string;
        };
        reader.readAsDataURL(this.selectedFile);
      } else {
        this.filePreview = null;
      }
    }
  }

  /**
   * Remove selected file
   */
  removeFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Calculate estimated total amount for bulk payment
   */
  calculateEstimatedTotal(): number {
    if (!this.selectedResident || !this.selectedStartPeriod) {
      return 0;
    }

    const monthCount = this.form.get('monthCount')?.value || 0;
    const monthlyAmount = this.calculateMonthlyIplAmount();

    return monthlyAmount * monthCount;
  }

  /**
   * Calculate monthly IPL amount based on formula
   * Formula: landArea * baseRate * (iplPercentage / 100)
   */
  calculateMonthlyIplAmount(): number {
    if (!this.selectedResident || !this.selectedStartPeriod) {
      return 0;
    }

    const landArea = this.selectedResident.landArea || this.selectedResident.houseUnit?.landArea || 0;
    const iplPercentage = this.selectedResident.iplPercentage || this.selectedResident.houseUnit?.iplPercentage || 100;
    const baseRate = this.selectedStartPeriod.baseRate || 2500;

    return (landArea * baseRate * (iplPercentage / 100));
  }

  /**
   * Get selected month count label
   */
  getMonthCountLabel(): string {
    const monthCount = this.form.get('monthCount')?.value;
    if (monthCount === 1) return '1 Bulan';
    return `${monthCount} Bulan`;
  }

  /**
   * Get period range summary
   */
  getPeriodRangeSummary(): string {
    if (!this.selectedStartPeriod) {
      return '-';
    }

    const monthCount = this.form.get('monthCount')?.value || 0;
    const startDate = new Date(this.selectedStartPeriod.year, this.selectedStartPeriod.month - 1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + monthCount - 1);

    const startLabel = this.formatPeriodLabel(startDate);
    const endLabel = this.formatPeriodLabel(endDate);

    return `${startLabel} s/d ${endLabel}`;
  }

  /**
   * Format period label
   */
  private formatPeriodLabel(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  /**
   * Validate form
   */
  private validateForm(): { valid: boolean; error?: string } {
    if (!this.selectedFile) {
      return { valid: false, error: 'Bukti transfer wajib diupload' };
    }

    if (!this.selectedResident) {
      return { valid: false, error: 'Pilih warga terlebih dahulu' };
    }

    if (!this.selectedStartPeriod) {
      return { valid: false, error: 'Pilih periode awal IPL terlebih dahulu' };
    }

    const monthCount = this.form.get('monthCount')?.value;
    if (monthCount < 2 || monthCount > 24) {
      return { valid: false, error: 'Jumlah bulan harus antara 2-24 bulan' };
    }

    // Validate file size (max 5MB)
    if (this.selectedFile && this.selectedFile.size > 5 * 1024 * 1024) {
      return { valid: false, error: 'Ukuran file maksimal 5MB' };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (this.selectedFile && !allowedTypes.includes(this.selectedFile.type)) {
      return { valid: false, error: 'Format file harus JPG, PNG, atau PDF' };
    }

    return { valid: true };
  }

  /**
   * Submit form
   */
  async onSubmit(): Promise<void> {
    // Redirect to main form instead
    this.router.navigate(['/admin/ipl-payments', 'form']);
    return;
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/ipl-payments']);
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
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      const min = control.errors['min'].min;
      return `Minimal ${min} bulan`;
    }

    if (control.errors['max']) {
      const max = control.errors['max'].max;
      return `Maksimal ${max} bulan`;
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
    return this.form.valid && this.selectedFile !== null;
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return 'Kirim Pembayaran Bulk';
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return 'Input Pembayaran IPL Bulk';
  }

  /**
   * Convert periods to select options
   */
  get periodOptions(): SelectOption[] {
    return this.periods.map(period => ({
      value: period.id,
      label: `${period.periodName} (${period.month}/${period.year})`
    }));
  }

  /**
   * Convert payment methods to select options
   */
  get paymentMethodOptions(): SelectOption[] {
    return this.PAYMENT_METHODS.map(method => ({
      value: method,
      label: this.getMethodLabel(method)
    }));
  }

  /**
   * Get payment method label
   */
  getMethodLabel(method: IplPaymentMethod): string {
    const labels = {
      [IplPaymentMethod.CASH]: 'Tunai',
      [IplPaymentMethod.TRANSFER]: 'Transfer',
      [IplPaymentMethod.E_WALLET]: 'E-Wallet',
      [IplPaymentMethod.CARD]: 'Kartu'
    };
    return labels[method] || method;
  }

  /**
   * Convert residents to select options with unit info
   */
  get residentOptions(): SelectOption[] {
    return this.residents.map(r => {
      const blockName = r.houseBlock?.blockName || '-';
      const unitNumber = r.unitNumber || '';
      return {
        value: r.id,
        label: `${r.firstName} ${r.lastName} - ${blockName} ${unitNumber}`
      };
    });
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
