import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ResidentPaymentsService } from '../resident-payments/resident-payments.service';
import { ResidentsService } from '../residents/residents.service';
import {
  ResidentPayment,
  CreateResidentPaymentDto,
  PaymentMethod,
} from '../resident-payments/resident-payments.model';
import { Resident } from '../residents/residents.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { AlertModalService, AlertModalRow } from '@services/alert-modal.service';
import {
  FormDatePickerComponent,
  FormSelectComponent,
  FormSearchableSelectComponent,
  FormInputComponent,
  FormTextareaComponent,
  FormButtonComponent,
  SelectOption
} from '@shared/ui/form-controls';

/**
 * Resident Payment (Iuran Warga) Form Page
 *
 * Records a single Iuran Warga payment. Iuran is a flat monthly rate
 * (`IURAN_MONTHLY_RATE`, Rp20.000): the operator enters any amount (typically a
 * multiple of the rate), and the matrix divides the total COMPLETED amount by
 * the rate to mark months covered — see `resident-payment-matrix`.
 *
 * The optional "Tagihan" (ResidentInvoice) link and bulk mode were removed:
 * the invoice feature is vestigial (menu disabled, no auto-generation, free
 * amounts that don't reconcile with the flat rate) and the matrix no longer
 * reads invoices.
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
    FormSearchableSelectComponent,
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
  private residentsService = inject(ResidentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertModalService = inject(AlertModalService);

  form: FormGroup;
  payment: ResidentPayment | null = null;
  isEditMode = false;
  loading = false;
  loadingData = true;
  error: string | null = null;

  residents: Resident[] = [];

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

  /**
   * Flat monthly Iuran Warga rate (IDR). Mirrors the backend
   * `RESIDENT_IURAN_MONTHLY_RATE` — used here only for the "≈ X bulan iuran"
   * helper hint under the amount field. The backend remains the single source
   * of truth for matrix coverage.
   */
  readonly IURAN_MONTHLY_RATE = 20000;

  private subscriptions: Subscription[] = [];

  constructor() {
    this.form = this.fb.group({
      residentId: ['', Validators.required],
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

    // Pre-select resident when opened via deep-link (e.g. from the Iuran Warga
    // matrix unpaid cell). The form control holds the id; the residents list
    // (loaded async) supplies the label for the searchable-select trigger.
    this.route.queryParams.subscribe(params => {
      if (params['residentId']) {
        this.form.get('residentId')?.setValue(params['residentId']);
      }
    });
  }

  /**
   * Load dropdown data (residents).
   */
  private loadData(): void {
    this.subscriptions.push(
      this.residentsService.getAll({ limit: 1000 }).subscribe({
        next: (residentsData) => {
          this.residents = residentsData.data;
          this.loadingData = false;
        },
        error: (error) => {
          this.error = 'Gagal memuat data';
          this.loadingData = false;
          console.error('Error loading data:', error);
        }
      })
    );
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

    const dto: CreateResidentPaymentDto = {
      residentId: formValue.residentId,
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
   * Create new payment
   */
  private createPayment(dto: CreateResidentPaymentDto): void {
    this.loadingService.show({ message: 'Mencatat pembayaran...' });

    this.subscriptions.push(
      this.residentPaymentsService.create(dto).subscribe({
        next: async (result) => {
          this.loadingService.dismiss();
          if (result) {
            // Show success modal (mirrors the IPL payment form flow) instead of
            // a plain toast, so the experience stays consistent across features.
            await this.showSuccessModal(result);
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
   * Show success modal with the payment number and amount.
   * Uses the reusable AlertModalComponent (rich content) — mirrors the IPL
   * payment form's success flow. "Lihat Detail" navigates to the payment
   * detail page; "Tambah Lagi" resets the form to record another payment.
   */
  private async showSuccessModal(payment: ResidentPayment): Promise<void> {
    const rows: AlertModalRow[] = [
      { label: 'Status', value: 'Menunggu Verifikasi' },
    ];

    // Total amount (with accent)
    rows.push({ label: 'Jumlah Pembayaran', value: this.formatCurrency(Number(payment.amount) || 0), emphasis: 'total' });

    const result = await this.alertModalService.open({
      type: 'success',
      title: 'Pembayaran Tercatat',
      message: 'Pembayaran berhasil dicatat dan menunggu verifikasi',
      highlight: { label: 'Nomor Pembayaran', value: payment.paymentNumber || '-' },
      rows,
      dismissable: false,
      buttons: [
        { text: 'Tambah Lagi', role: 'cancel', variant: 'outline', value: 'add' },
        { text: 'Lihat Detail', role: 'confirm', variant: 'solid', value: 'detail' },
      ],
    });

    if (result === 'detail') {
      this.router.navigate(['/admin/resident-payments', payment.id]);
    } else {
      // 'add' (or any other dismissal) → reset the form and stay on the page.
      this.resetFormForAnother();
    }
  }

  /**
   * Reset the form to record another payment. Re-applies the sensible defaults
   * (today's date + TRANSFER method) so the next entry is ready to go, and
   * clears the proof file.
   */
  private resetFormForAnother(): void {
    this.form.reset({
      residentId: '',
      paymentDate: this.formatDateForInput(new Date()),
      paymentMethod: PaymentMethod.TRANSFER,
      paymentChannel: '',
      referenceNumber: '',
      amount: 0,
      bankName: '',
      accountNumber: '',
      notes: ''
    });
    this.selectedFile = null;
    this.filePreview = null;
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = '';
    }
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
   * Number of full iuran months the currently entered amount would cover
   * (floor of amount / monthly rate). Remainders roll over at the matrix level.
   */
  get iuranMonthsPreview(): number {
    const amount = Number(this.form.get('amount')?.value) || 0;
    return this.IURAN_MONTHLY_RATE > 0
      ? Math.floor(amount / this.IURAN_MONTHLY_RATE)
      : 0;
  }

  /**
   * Helper text under the amount field: a live "≈ X bulan iuran" estimate, so
   * the operator enters multiples of the monthly rate and can predict the
   * matrix coverage.
   */
  get amountHelperText(): string {
    return `≈ ${this.iuranMonthsPreview} bulan iuran (${this.formatCurrency(this.IURAN_MONTHLY_RATE)}/bln)`;
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
   * Convert residents to select options (value + label for the searchable
   * select modal). Label includes block + unit so operators can disambiguate.
   */
  get residentOptions(): SelectOption[] {
    return this.residents.map(r => ({
      value: r.id,
      label: `${r.firstName} ${r.lastName} - ${r.houseBlock?.blockName || '-'} ${r.unitNumber || ''}`
    }));
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return 'Catat Pembayaran Iuran';
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return 'Catat Pembayaran';
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
