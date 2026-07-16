import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormArray } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subscription, combineLatest } from 'rxjs';
import { ResidentPaymentsService } from '../resident-payments/resident-payments.service';
import { ResidentInvoicesService } from '../resident-invoices/resident-invoices.service';
import { ResidentsService } from '../residents/residents.service';
import {
  ResidentPayment,
  CreateResidentPaymentDto,
  PaymentMethod,
  BulkPaymentItemDto,
  CreateBulkResidentPaymentDto
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

  // Bulk payment mode
  isBulkMode = false;
  selectedInvoices = new Set<string>();
  bulkPayments: BulkPaymentItemDto[] = [];

  residents: Resident[] = [];
  invoices: ResidentInvoice[] = [];
  selectedInvoice: ResidentInvoice | null = null;

  // File upload (bukti transfer)
  selectedFile: File | null = null;
  filePreview: string | null = null;

  // Payment methods
  readonly PAYMENT_METHODS = Object.values(PaymentMethod);
  readonly PAYMENT_METHOD_LABELS = {
    CASH: 'Tunai',
    TRANSFER: 'Transfer',
    CARD: 'Kartu',
    E_WALLET: 'E-Wallet'
  };
  // Methods that require a bukti transfer upload (CASH is optional)
  readonly PROOF_REQUIRED_METHODS: PaymentMethod[] = [
    PaymentMethod.TRANSFER,
    PaymentMethod.E_WALLET,
    PaymentMethod.CARD
  ];

  private subscriptions: Subscription[] = [];

  constructor() {
    this.form = this.fb.group({
      residentId: ['', Validators.required],
      invoiceId: [''],
      paymentDate: [this.formatDateForInput(new Date()), Validators.required],
      paymentMethod: [PaymentMethod.TRANSFER, Validators.required],
      paymentChannel: [''],
      referenceNumber: [''],
      amount: [0, Validators.min(1)],
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
    // For bulk mode, check if invoices are selected
    if (this.isBulkMode) {
      if (this.selectedInvoices.size === 0) {
        this.toastService.error('Mohon pilih minimal satu tagihan');
        return;
      }
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.toastService.error('Mohon lengkapi semua field yang wajib diisi');
        return;
      }
      this.submitBulkPayments(this.form.value);
      return;
    }

    // Single mode validation
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    // Conditional proof-file validation (mirror backend: required for non-CASH)
    if (this.isProofRequired() && !this.selectedFile) {
      this.form.markAllAsTouched();
      this.toastService.error(`Bukti transfer wajib diupload untuk metode ${this.getPaymentMethodLabel()}`);
      return;
    }

    // Validate file size & type when a file is selected
    if (this.selectedFile) {
      if (this.selectedFile.size > 5 * 1024 * 1024) {
        this.toastService.error('Ukuran file maksimal 5MB');
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(this.selectedFile.type)) {
        this.toastService.error('Format file harus JPG, PNG, atau PDF');
        return;
      }
    }

    const formValue = this.form.value;

    // Validate amount against remaining (only when linked to an invoice)
    if (this.selectedInvoice && formValue.amount > this.selectedInvoice.remainingAmount) {
      this.toastService.error(`Jumlah pembayaran melebihi sisa tagihan (${this.formatCurrency(this.selectedInvoice.remainingAmount)})`);
      return;
    }

    const dto: CreateResidentPaymentDto = {
      residentId: formValue.residentId,
      invoiceId: formValue.invoiceId || undefined,
      paymentDate: formValue.paymentDate,
      paymentMethod: formValue.paymentMethod,
      paymentChannel: formValue.paymentChannel || undefined,
      referenceNumber: formValue.referenceNumber || undefined,
      amount: formValue.amount,
      bankName: formValue.bankName || undefined,
      accountNumber: formValue.accountNumber || undefined,
      notes: formValue.notes || undefined,
      proofFile: this.selectedFile || undefined
    };

    this.createPayment(dto);
  }

  /**
   * Submit bulk payments
   */
  private submitBulkPayments(formValue: any): void {
    this.loadingService.show({ message: 'Memproses pembayaran bulk...' });

    // Create bulk payment items from selected invoices
    const payments: BulkPaymentItemDto[] = Array.from(this.selectedInvoices).map(invoiceId => {
      const invoice = this.invoices.find(inv => inv.id === invoiceId);
      return {
        residentId: invoice?.residentId || '',
        invoiceId: invoiceId,
        paymentDate: formValue.paymentDate,
        paymentMethod: formValue.paymentMethod,
        paymentChannel: formValue.paymentChannel,
        referenceNumber: formValue.referenceNumber,
        amount: invoice?.remainingAmount || 0,
        bankName: formValue.bankName,
        accountNumber: formValue.accountNumber,
        notes: formValue.notes
      };
    });

    const bulkDto: CreateBulkResidentPaymentDto = {
      payments,
      batchNotes: `Bulk payment created on ${new Date().toISOString()}`
    };

    this.subscriptions.push(
      this.residentPaymentsService.createBulk(bulkDto).subscribe({
        next: (result) => {
          this.loadingService.dismiss();
          if (result.failureCount > 0) {
            this.toastService.warning(
              `${result.successCount} pembayaran berhasil, ${result.failureCount} gagal`
            );
          } else {
            this.toastService.success('Semua pembayaran berhasil dicatat');
          }
          this.router.navigate(['/admin/resident-payments']);
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal memproses pembayaran bulk');
          console.error('Bulk payment error:', error);
        }
      })
    );
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
    if (this.isBulkMode) {
      return this.form.valid && this.selectedInvoices.size > 0;
    }
    // Bukti transfer is required for non-CASH methods
    if (this.isProofRequired() && !this.selectedFile) {
      return false;
    }
    return this.form.valid;
  }

  /**
   * Whether the currently selected payment method requires a bukti transfer.
   */
  isProofRequired(): boolean {
    const method = this.form.get('paymentMethod')?.value as PaymentMethod;
    return this.PROOF_REQUIRED_METHODS.includes(method);
  }

  /**
   * Handle file selection (bukti transfer)
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
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Convert residents to select options
   */
  get residentOptions(): SelectOption[] {
    return this.residents.map(r => ({
      value: r.id,
      label: `${r.firstName} ${r.lastName} - ${r.houseBlock?.blockName || '-'} ${r.unitNumber || ''}`
    }));
  }

  /**
   * Toggle bulk mode
   */
  toggleBulkMode(): void {
    this.isBulkMode = !this.isBulkMode;
    if (!this.isBulkMode) {
      this.selectedInvoices.clear();
    }
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return this.isBulkMode ? 'Catat Pembayaran Bulk' : 'Catat Pembayaran';
  }

  /**
   * Toggle invoice selection for bulk
   */
  toggleInvoiceSelection(invoiceId: string): void {
    if (this.selectedInvoices.has(invoiceId)) {
      this.selectedInvoices.delete(invoiceId);
    } else {
      this.selectedInvoices.add(invoiceId);
    }
  }

  /**
   * Check if invoice is selected
   */
  isInvoiceSelected(invoiceId: string): boolean {
    return this.selectedInvoices.has(invoiceId);
  }

  /**
   * Get total amount for selected invoices
   */
  getSelectedTotalAmount(): number {
    return Array.from(this.selectedInvoices).reduce((total, invoiceId) => {
      const invoice = this.invoices.find(inv => inv.id === invoiceId);
      return total + (invoice?.remainingAmount || 0);
    }, 0);
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    if (this.isBulkMode && this.selectedInvoices.size > 0) {
      return `Catat ${this.selectedInvoices.size} Pembayaran`;
    }
    return 'Catat Pembayaran';
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
