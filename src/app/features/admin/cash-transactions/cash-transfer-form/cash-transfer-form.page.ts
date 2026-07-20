import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CashTransactionsService } from '../cash-transactions.service';
import {
  AccountBalance,
  CashAccountCode,
  FundType
} from '../cash-transactions.model';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { getErrorMessage } from '@validators/validators';

import {
  FormInputComponent,
  FormSelectComponent,
  FormTextareaComponent,
  FormButtonComponent,
  SelectOption
} from '@shared/ui/form-controls';

/**
 * Cash Transfer Form Page
 * Move money between Kas IPL and Kas Warga. Posts to
 * POST /cash-transactions/transfer which records two paired legs.
 */
@Component({
  selector: 'app-cash-transfer-form',
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
  templateUrl: './cash-transfer-form.page.html',
  styleUrls: ['./cash-transfer-form.page.scss']
})
export class CashTransferFormPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cashTransactionsService = inject(CashTransactionsService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  transferForm: FormGroup;
  isSubmitting = false;
  accountBalances: AccountBalance[] = [];

  // Kas options, built from loaded balances (with current saldo as suffix).
  fromOptions: SelectOption[] = [];
  toOptions: SelectOption[] = [];

  dateSelected = true;
  private subscriptions: Subscription[] = [];

  constructor() {
    this.transferForm = this.initializeForm();
  }

  ngOnInit(): void {
    this.loadAccountBalances();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private initializeForm(): FormGroup {
    const today = new Date().toISOString();
    return this.fb.group({
      fromAccountCode: ['', [Validators.required]],
      toAccountCode: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      transactionDate: [today, [Validators.required]],
      description: ['', [Validators.maxLength(500)]]
    });

  }

  private loadAccountBalances(): void {
    this.subscriptions.push(
      this.cashTransactionsService.getAccountBalances().subscribe({
        next: (balances) => {
          this.accountBalances = balances;
          this.fromOptions = this.buildOptions();
          this.toOptions = this.buildOptions();
          // Default direction: Kas IPL -> Kas Warga (the common case).
          this.transferForm.patchValue({
            fromAccountCode: this.codeForFund(FundType.IPL) ?? '',
            toAccountCode: this.codeForFund(FundType.WARGA) ?? ''
          });
        },
        error: () => {
          this.accountBalances = [];
        }
      })
    );
  }

  private buildOptions(): SelectOption[] {
    return this.accountBalances.map((b) => ({
      value: b.accountCode,
      label: `${b.accountName} (Saldo: ${this.formatCurrency(b.balance)})`
    }));
  }

  private codeForFund(fund: FundType): string | undefined {
    return this.accountBalances.find((b) => b.fundType === fund)?.accountCode;
  }

  /** Saldo of the currently selected source Kas (for an inline hint). */
  get sourceBalance(): number | null {
    const code = this.transferForm.get('fromAccountCode')?.value;
    return this.accountBalances.find((b) => b.accountCode === code)?.balance ?? null;
  }

  get f(): { [key: string]: AbstractControl } {
    return this.transferForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.transferForm.get(fieldName);
    return control ? control.invalid && control.touched : false;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.transferForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }
    const fieldLabels: { [key: string]: string } = {
      fromAccountCode: 'Kas asal',
      toAccountCode: 'Kas tujuan',
      amount: 'Nominal',
      transactionDate: 'Tanggal',
      description: 'Keterangan'
    };
    return getErrorMessage(control.errors, fieldLabels[fieldName] || fieldName);
  }

  isFormValid(): boolean {
    const from = this.transferForm.get('fromAccountCode')?.value;
    const to = this.transferForm.get('toAccountCode')?.value;
    return (
      this.transferForm.valid &&
      !this.isSubmitting &&
      !!from &&
      !!to &&
      from !== to
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      Object.keys(this.f).forEach((key) => this.f[key].markAsTouched());
      const from = this.transferForm.get('fromAccountCode')?.value;
      const to = this.transferForm.get('toAccountCode')?.value;
      if (from && to && from === to) {
        this.toastService.warning('Kas asal dan tujuan harus berbeda');
      }
      return;
    }

    this.isSubmitting = true;
    const v = this.transferForm.value;
    const dto = {
      fromAccountCode: v.fromAccountCode as CashAccountCode,
      toAccountCode: v.toAccountCode as CashAccountCode,
      amount: Number(v.amount) || 0,
      transactionDate: new Date(v.transactionDate).toISOString(),
      description: v.description?.trim() || undefined
    };

    try {
      await this.loadingService.show({ message: 'Memproses transfer...' });
      this.subscriptions.push(
        this.cashTransactionsService.transfer(dto).subscribe({
          next: () => {
            this.loadingService.dismiss();
            this.toastService.success('Transfer antar kas berhasil!');
            this.goBack();
          },
          error: (error) => {
            this.loadingService.dismiss();
            this.isSubmitting = false;
            const msg = error?.error?.message || 'Gagal melakukan transfer';
            this.toastService.error(msg);
            console.error('Transfer error:', error);
          }
        })
      );
    } catch (error) {
      this.loadingService.dismiss();
      this.isSubmitting = false;
      this.toastService.error('Terjadi kesalahan');
      console.error('Submit error:', error);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/cash-transactions']);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  get pageTitle(): string {
    return 'Transfer Antar Kas';
  }

  get submitButtonText(): string {
    return 'Transfer';
  }
}
