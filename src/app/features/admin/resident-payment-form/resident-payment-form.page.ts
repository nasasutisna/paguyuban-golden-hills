import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subscription, combineLatest } from 'rxjs';
import { ResidentPaymentsService } from '../resident-payments/resident-payments.service';
import { ResidentInvoicesService } from '../resident-invoices/resident-invoices.service';
import { ResidentsService } from '../residents/residents.service';
import {
  ResidentPayment,
  CreateResidentPaymentDto,
  PaymentMethod
} from '../resident-payments/resident-payments.model';
import { ResidentInvoice } from '../resident-invoices/resident-invoices.model';
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
 * Resident Payment Form Page
 * Create or record resident payment
 */
@Component({
  selector: 'app-resident-payment-form',
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
  templateUrl: './resident-payment-form.page.html',
  styleUrls: ['./resident-payment-form.page.scss']
})
export class ResidentPaymentFormPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private residentPaymentsService = inject(ResidentPaymentsService);
  private residentInvoicesService = inject(ResidentInvoicesService);
  private residentsService = inject(ResidentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);

  form: FormGroup;
  payment: ResidentPayment | null = null;
  isEditMode = false;
  loading = false;
  loadingData = true;
  error: string | null = null;

  residents: Resident[] = [];
  invoices: ResidentInvoice[] = [];
  selectedInvoice: ResidentInvoice | null = null;

  // Payment methods
  readonly PAYMENT_METHODS = Object.values(PaymentMethod);
  readonly PAYMENT_METHOD_LABELS = {
    CASH: 'Tunai',
    TRANSFER: 'Transfer',
    CARD: 'Kartu',
    E_WALLET: 'E-Wallet'
  };

  private subscriptions: Subscription[] = [];

  constructor() {
    this.form = this.fb.group({
      residentId: ['', Validators.required],
      invoiceId: ['', Validators.required],
      paymentDate: [this.formatDateForInput(new Date()), Validators.required],
      paymentMethod: [PaymentMethod.TRANSFER, Validators.required],
      paymentChannel: [''],
      referenceNumber: [''],
      amount: [0, [Validators.required, Validators.min(1)]],
      bankName: [''],
      accountNumber: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();

    // Check if invoiceId is passed in query params
    this.route.queryParams.subscribe(params => {
      if (params['invoiceId']) {
        this.form.get('invoiceId')?.setValue(params['invoiceId']);
        this.onInvoiceChange();
      }
    });
  }

  /**
   * Load dropdown data (residents and invoices)
   */
  private loadData(): void {
    // Load pending invoices only
    this.subscriptions.push(
      this.residentInvoicesService.getPending().subscribe({
        next: (invoices) => {
          this.invoices = invoices;
          this.loadingData = false;
        },
        error: (error) => {
          this.error = 'Gagal memuat data';
          this.loadingData = false;
          console.error('Error loading data:', error);
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
  }

  /**
   * Handle invoice selection change
   */
  onInvoiceChange(): void {
    const invoiceId = this.form.get('invoiceId')?.value;
    const invoice = this.invoices.find(inv => inv.id === invoiceId);

    if (invoice) {
      this.selectedInvoice = invoice;
      // Auto-fill resident
      this.form.get('residentId')?.setValue(invoice.residentId);
      // Auto-fill amount with remaining amount
      if (invoice.remainingAmount > 0) {
        this.form.get('amount')?.setValue(invoice.remainingAmount);
      }
    } else {
      this.selectedInvoice = null;
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

    const formValue = this.form.value;

    // Validate amount against remaining
    if (this.selectedInvoice && formValue.amount > this.selectedInvoice.remainingAmount) {
      this.toastService.error(`Jumlah pembayaran melebihi sisa tagihan (${this.formatCurrency(this.selectedInvoice.remainingAmount)})`);
      return;
    }

    this.createPayment(formValue);
  }

  /**
   * Create new payment
   */
  private createPayment(dto: CreateResidentPaymentDto): void {
    this.loadingService.show({ message: 'Mencatat pembayaran...' });

    this.subscriptions.push(
      this.residentPaymentsService.create(dto).subscribe({
        next: (result) => {
          this.loadingService.dismiss();
          if (result) {
            this.toastService.success('Pembayaran berhasil dicatat');
            this.router.navigate(['/admin/resident-payments', result.id]);
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal mencatat pembayaran');
          console.error('Create payment error:', error);
        }
      })
    );
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/resident-payments']);
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

    return 'Input tidak valid';
  }

  /**
   * Get selected invoice
   */
  get selectedInvoiceData(): ResidentInvoice | undefined {
    const invoiceId = this.form.get('invoiceId')?.value;
    return this.invoices.find(inv => inv.id === invoiceId);
  }

  /**
   * Get selected resident
   */
  get selectedResident(): Resident | undefined {
    const residentId = this.form.get('residentId')?.value;
    return this.residents.find(r => r.id === residentId);
  }

  /**
   * Check if payment method requires bank info
   */
  needsBankInfo(): boolean {
    const method = this.form.get('paymentMethod')?.value;
    return method === PaymentMethod.TRANSFER || method === PaymentMethod.CARD || method === PaymentMethod.E_WALLET;
  }

  /**
   * Get payment method label
   */
  getPaymentMethodLabel(): string {
    const method = this.form.get('paymentMethod')?.value as PaymentMethod;
    return this.PAYMENT_METHOD_LABELS[method] || method;
  }

  /**
   * Calculate remaining amount after payment
   */
  getRemainingAfterPayment(): number {
    const selectedInvoice = this.selectedInvoiceData;
    if (!selectedInvoice) return 0;
    const paymentAmount = this.form.get('amount')?.value || 0;
    return Math.max(0, (selectedInvoice.remainingAmount || 0) - paymentAmount);
  }

  /**
   * Convert invoices to select options
   */
  get invoiceOptions(): SelectOption[] {
    return this.invoices.map(invoice => ({
      value: invoice.id,
      label: `${invoice.invoiceNumber} - ${invoice.resident?.firstName || ''} ${invoice.resident?.lastName || ''} - ${this.formatCurrency(invoice.remainingAmount)}`
    }));
  }

  /**
   * Convert payment methods to select options
   */
  get paymentMethodOptions(): SelectOption[] {
    return this.PAYMENT_METHODS.map(method => ({
      value: method,
      label: this.PAYMENT_METHOD_LABELS[method] || method
    }));
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
    return 'Catat Pembayaran';
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return 'Catat Pembayaran';
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
