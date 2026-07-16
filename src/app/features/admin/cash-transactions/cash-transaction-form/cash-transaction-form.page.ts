import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  FormControl
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription, switchMap, EMPTY } from 'rxjs';
import { CashTransactionsService } from '../cash-transactions.service';
import {
  CashTransaction,
  CreateCashTransactionDto,
  UpdateCashTransactionDto,
  TransactionType,
  PaymentMethod,
  TransactionType as TxType,
  PaymentMethod as PayMethod,
  TransactionCategory,
  TRANSACTION_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  REFERENCE_TYPE_LABELS,
  getReferenceTypeOptions
} from '../cash-transactions.model';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { getErrorMessage } from '@validators/validators';

// Form control components
import {
  FormInputComponent,
  FormSelectComponent,
  FormTextareaComponent,
  FormButtonComponent,
  SelectOption
} from '@shared/ui/form-controls';

/**
 * Cash Transaction Form Page
 * Handles both create and edit modes based on route parameter presence
 */
@Component({
  selector: 'app-cash-transaction-form',
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
  templateUrl: './cash-transaction-form.page.html',
  styleUrls: ['./cash-transaction-form.page.scss']
})
export class CashTransactionFormPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cashTransactionsService = inject(CashTransactionsService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  // Form and state
  cashTransactionForm: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  cashTransactionId: string | null = null;

  // Transaction type options
  transactionTypeOptions: SelectOption[] = [
    { value: TxType.INCOME, label: TRANSACTION_TYPE_LABELS[TxType.INCOME] },
    { value: TxType.EXPENSE, label: TRANSACTION_TYPE_LABELS[TxType.EXPENSE] }
  ];

  // Payment method options
  paymentMethodOptions: SelectOption[] = [
    { value: PayMethod.CASH, label: PAYMENT_METHOD_LABELS[PayMethod.CASH] },
    { value: PayMethod.TRANSFER, label: PAYMENT_METHOD_LABELS[PayMethod.TRANSFER] },
    { value: PayMethod.CARD, label: PAYMENT_METHOD_LABELS[PayMethod.CARD] }
  ];

  // Category options
  categoryOptions: SelectOption[] = [];

  // Reference type options (dynamically filtered by transaction type)
  referenceTypeOptions: SelectOption[] = getReferenceTypeOptions('ALL');

  // Date formatting for ion-datetime
  dateSelected = true;

  private subscriptions: Subscription[] = [];

  constructor() {
    this.cashTransactionForm = this.initializeForm();
  }

  ngOnInit(): void {
    // Load categories for dropdown
    this.loadCategories();

    // Update reference type options when transaction type changes
    const transactionTypeControl = this.cashTransactionForm.get('transactionType');
    if (transactionTypeControl) {
      this.subscriptions.push(
        transactionTypeControl.valueChanges.subscribe((transactionType) => {
          this.updateReferenceTypeOptions(transactionType);
        })
      );
    }

    // Check if we're in edit mode by checking for :id parameter
    this.subscriptions.push(
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.cashTransactionId = id;
          this.loadCashTransaction(id);
        }
      })
    );
  }

  /**
   * Update reference type options based on transaction type
   */
  private updateReferenceTypeOptions(transactionType: TransactionType): void {
    this.referenceTypeOptions = getReferenceTypeOptions(transactionType);

    // If current referenceType is not in the filtered options, clear it
    const currentReferenceType = this.cashTransactionForm.get('referenceType')?.value;
    if (currentReferenceType) {
      const isValidOption = this.referenceTypeOptions.some(opt => opt.value === currentReferenceType);
      if (!isValidOption) {
        this.cashTransactionForm.get('referenceType')?.setValue('');
      }
    }
  }

  /**
   * Handle reference type change
   * Can be used to auto-fill or validate related fields
   */
  onReferenceTypeChange(): void {
    const referenceType = this.cashTransactionForm.get('referenceType')?.value;
    // You can add logic here to auto-fill referenceId or show related fields
    console.log('Reference type changed:', referenceType);
  }

  /**
   * Load transaction categories for dropdown
   */
  private loadCategories(): void {
    this.subscriptions.push(
      this.cashTransactionsService.getCategories().subscribe({
        next: (categories) => {
          this.categoryOptions = categories.map((cat: TransactionCategory) => ({
            value: cat.id,
            label: `${cat.categoryCode} - ${cat.categoryName}`
          }));
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.categoryOptions = [];
          this.toastService.warning('Gagal memuat kategori transaksi');
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
    const today = new Date().toISOString(); // Full ISO format for ion-datetime

    return this.fb.group({
      transactionDate: [
        today,
        [Validators.required]
      ],
      transactionType: [
        TxType.INCOME,
        [Validators.required]
      ],
      categoryId: [
        '',
        [Validators.required]
      ],
      amount: [
        '',
        [Validators.required, Validators.min(0)]
      ],
      paymentMethod: [
        PayMethod.CASH,
        [Validators.required]
      ],
      referenceType: [''],
      referenceId: [''],
      referenceNumber: ['', [Validators.maxLength(100)]],
      description: [
        '',
        [Validators.required]
      ],
      notes: ['', [Validators.maxLength(1000)]],
      requiresApproval: [false]
    });
  }

  /**
   * Load existing cash transaction for edit
   */
  private loadCashTransaction(id: string): void {
    this.loadingService.show({ message: 'Memuat transaksi...' });

    this.subscriptions.push(
      this.cashTransactionsService.getById(id).subscribe({
        next: (cashTransaction) => {
          this.loadingService.dismiss();
          if (cashTransaction) {
            this.populateForm(cashTransaction);
          } else {
            this.toastService.error('Transaksi tidak ditemukan');
            this.goBack();
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal memuat transaksi');
          console.error('Load cash transaction error:', error);
          this.goBack();
        }
      })
    );
  }

  /**
   * Populate form with existing data
   */
  private populateForm(cashTransaction: CashTransaction): void {
    this.cashTransactionForm.patchValue({
      transactionDate: cashTransaction.transactionDate, // Keep full ISO for ion-datetime
      transactionType: cashTransaction.transactionType,
      categoryId: cashTransaction.categoryId,
      amount: cashTransaction.amount,
      paymentMethod: cashTransaction.paymentMethod,
      referenceType: cashTransaction.referenceType || '',
      referenceId: cashTransaction.referenceId || '',
      referenceNumber: cashTransaction.referenceNumber || '',
      description: cashTransaction.description,
      notes: cashTransaction.notes || '',
      requiresApproval: cashTransaction.requiresApproval
    });
  }

  /**
   * Get form controls
   */
  get f(): { [key: string]: AbstractControl } {
    return this.cashTransactionForm.controls;
  }

  /**
   * Get error message for a form field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.cashTransactionForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const fieldLabels: { [key: string]: string } = {
      transactionDate: 'Tanggal transaksi',
      transactionType: 'Jenis transaksi',
      categoryId: 'Kategori',
      amount: 'Nominal',
      paymentMethod: 'Metode pembayaran',
      referenceType: 'Tipe referensi',
      referenceId: 'ID referensi',
      referenceNumber: 'Nomor referensi',
      description: 'Deskripsi',
      notes: 'Catatan'
    };

    return getErrorMessage(control.errors, fieldLabels[fieldName] || fieldName);
  }

  /**
   * Check if a field is invalid and touched
   * Used to show validation errors in form-control components
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.cashTransactionForm.get(fieldName);
    return control ? control.invalid && control.touched : false;
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.cashTransactionForm.valid && !this.isSubmitting;
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
    const formValue = this.cashTransactionForm.value;

    // Build DTO from form values
    const dto = this.buildDto(formValue);

    try {
      await this.loadingService.show({
        message: this.isEditMode ? 'Menyimpan transaksi...' : 'Membuat transaksi...'
      });

      if (this.isEditMode && this.cashTransactionId) {
        // Update existing
        this.subscriptions.push(
          this.cashTransactionsService.update(this.cashTransactionId, dto).subscribe({
            next: () => {
              this.loadingService.dismiss();
              this.toastService.success('Transaksi berhasil disimpan!');
              this.goBack();
            },
            error: (error) => {
              this.loadingService.dismiss();
              this.isSubmitting = false;
              this.toastService.error('Gagal menyimpan transaksi');
              console.error('Update cash transaction error:', error);
            }
          })
        );
      } else {
        // Create new
        this.subscriptions.push(
          this.cashTransactionsService.create(dto as CreateCashTransactionDto).subscribe({
            next: () => {
              this.loadingService.dismiss();
              this.toastService.success('Transaksi berhasil dibuat!');
              this.goBack();
            },
            error: (error) => {
              this.loadingService.dismiss();
              this.isSubmitting = false;
              this.toastService.error('Gagal membuat transaksi');
              console.error('Create cash transaction error:', error);
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
  private buildDto(formValue: any): CreateCashTransactionDto | UpdateCashTransactionDto {
    const dto: any = {
      transactionDate: new Date(formValue.transactionDate).toISOString(),
      transactionType: formValue.transactionType,
      categoryId: formValue.categoryId,
      amount: Number(formValue.amount) || 0,
      paymentMethod: formValue.paymentMethod,
      description: formValue.description?.trim(),
      requiresApproval: formValue.requiresApproval ?? false
    };

    // Optional fields
    if (formValue.referenceType?.trim()) {
      dto.referenceType = formValue.referenceType.trim();
    }
    if (formValue.referenceId?.trim()) {
      dto.referenceId = formValue.referenceId.trim();
    }
    if (formValue.referenceNumber?.trim()) {
      dto.referenceNumber = formValue.referenceNumber.trim();
    }
    if (formValue.notes?.trim()) {
      dto.notes = formValue.notes.trim();
    }

    return dto;
  }

  /**
   * Navigate back to list
   */
  goBack(): void {
    this.router.navigate(['/admin/cash-transactions']);
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return this.isEditMode ? 'Edit Transaksi' : 'Buat Transaksi';
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return this.isEditMode ? 'Simpan' : 'Buat';
  }
}
