import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ExpenseRequestsService } from '../expense-requests.service';
import { FileAttachmentsService } from '@core/services/file-attachments.service';
import { EXPENSE_REQUEST_ENTITY_TYPE } from '@models/file-attachment.model';
import {
  CreateExpenseRequestDto,
  ExpensePaymentMethod,
  EXPENSE_PAYMENT_METHOD_LABELS,
} from '../expense-requests.model';
import { SelectOption } from '@shared/ui/form-controls/form.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  FormDatePickerComponent,
  FormSelectComponent,
  FormInputComponent,
  FormTextareaComponent,
  FormButtonComponent,
} from '@shared/ui/form-controls';

interface SelectedFile {
  file: File;
  preview: string | null;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

/**
 * Expense Request Form Page (create only).
 *
 * Submit flow is two-step (matches backend contract):
 *   1. If proof photos are attached -> upload them via FileAttachmentsService
 *      -> collect fileIds.
 *   2. POST /expense-requests with the form fields + fileIds.
 *
 * Category and resident are auto-resolved by the backend (omitted here).
 */
@Component({
  selector: 'app-expense-request-form',
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
    FormButtonComponent,
  ],
  templateUrl: './expense-request-form.page.html',
  styleUrls: ['./expense-request-form.page.scss'],
})
export class ExpenseRequestFormPage implements OnDestroy {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private expenseRequestsService = inject(ExpenseRequestsService);
  private fileAttachmentsService = inject(FileAttachmentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  form: FormGroup;
  loading = false;
  selectedFiles: SelectedFile[] = [];

  private subscriptions: Subscription[] = [];

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      transactionDate: [this.formatDateForInput(new Date()), Validators.required],
      paymentMethod: [ExpensePaymentMethod.TRANSFER],
    });
  }

  // ----------------------------------------------------------------
  // File handling
  // ----------------------------------------------------------------

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const incoming = Array.from(input.files);
    input.value = ''; // allow re-selecting the same file later

    for (const file of incoming) {
      if (this.selectedFiles.length >= MAX_FILES) {
        this.toastService.error(`Maksimal ${MAX_FILES} foto bukti`);
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        this.toastService.error(`${file.name} melebihi 5MB`);
        continue;
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        this.toastService.error(`${file.name} format tidak didukung (JPG/PNG/PDF)`);
        continue;
      }
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      this.selectedFiles.push({ file, preview });
    }
  }

  removeFile(index: number): void {
    const entry = this.selectedFiles[index];
    if (entry?.preview) {
      URL.revokeObjectURL(entry.preview);
    }
    this.selectedFiles.splice(index, 1);
  }

  // ----------------------------------------------------------------
  // Submit (two-step)
  // ----------------------------------------------------------------

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    const amount = Number(this.form.get('amount')?.value);
    if (!amount || amount < 0.01) {
      this.toastService.error('Jumlah harus lebih dari 0');
      return;
    }

    const formValue = this.form.value;
    const transactionDate = String(formValue.transactionDate || '').slice(0, 10);

    const baseDto: CreateExpenseRequestDto = {
      title: formValue.title?.trim(),
      description: formValue.description?.trim() || undefined,
      amount,
      transactionDate,
      paymentMethod: formValue.paymentMethod || undefined,
    };

    this.loading = true;
    await this.loadingService.show({ message: 'Mengunggah foto bukti...' });

    // Step 1: upload proof photos (if any) -> fileIds
    const upload$ = this.selectedFiles.length > 0
      ? this.fileAttachmentsService.uploadFiles(
        this.selectedFiles.map((s) => s.file),
        EXPENSE_REQUEST_ENTITY_TYPE,
        'proof'
      )
      : null;

    if (upload$) {
      this.subscriptions.push(
        upload$.subscribe({
          next: (attachments) => {
            const fileIds = attachments.map((a) => a.id);
            this.createRequest({ ...baseDto, fileIds });
          },
          error: (error) => {
            this.loading = false;
            this.loadingService.dismiss();
            this.toastService.error('Gagal mengunggah foto bukti');
            console.error('Upload error:', error);
          },
        })
      );
    } else {
      this.createRequest(baseDto);
    }
  }

  /** Step 2: create the expense request (with optional fileIds). */
  private async createRequest(dto: CreateExpenseRequestDto) {
    await this.loadingService.show({ message: 'Mengirim request...' });
    this.subscriptions.push(
      this.expenseRequestsService.create(dto).subscribe({
        next: async (result) => {
          this.loading = false;
          this.loadingService.dismiss();
          if (result) {
            await this.showSuccessModal(result);
          }
        },
        error: (error) => {
          this.loading = false;
          this.loadingService.dismiss();
          this.toastService.error('Gagal mengirim request pengeluaran');
          console.error('Create expense request error:', error);
        },
      })
    );
  }

  private async showSuccessModal(request: any): Promise<void> {
    const isApproved = request.status === 'APPROVED';
    const alert = await this.alertController.create({
      header: '✅ Request Terkirim',
      message: `
        <div style="text-align:center">
          <p style="font-family:'Courier New',monospace;font-weight:700;font-size:18px;color:var(--ion-color-primary)">${request.requestNumber || '-'}</p>
          <p>${isApproved ? 'Request otomatis disetujui & diposting ke kas.' : 'Request berhasil dikirim, menunggu persetujuan admin/keuangan.'}</p>
        </div>`,
      buttons: [
        {
          text: 'Ajukan Lagi',
          role: 'cancel',
          handler: () => this.resetForm(),
        },
        {
          text: 'Lihat Detail',
          handler: () => this.router.navigate(['/expense-requests', request.id]),
        },
      ],
    });
    await alert.present();
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  navigateBack(): void {
    this.router.navigate(['/expense-requests']);
  }

  resetForm(): void {
    this.form.reset({
      title: '',
      description: '',
      amount: '',
      transactionDate: this.formatDateForInput(new Date()),
      paymentMethod: ExpensePaymentMethod.TRANSFER,
    });
    this.selectedFiles.forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
    this.selectedFiles = [];
  }

  isFieldInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'Field ini wajib diisi';
    if (control.errors['maxlength']) return 'Maksimal 200 karakter';
    if (control.errors['min']) return 'Jumlah harus lebih dari 0';
    return 'Input tidak valid';
  }

  isFormValid(): boolean {
    return this.form.valid;
  }

  get paymentMethodOptions(): SelectOption[] {
    return (Object.values(ExpensePaymentMethod) as ExpensePaymentMethod[]).map((method) => ({
      value: method,
      label: EXPENSE_PAYMENT_METHOD_LABELS[method] || method,
    }));
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get pageTitle(): string {
    return 'Ajukan Request Pengeluaran';
  }

  get submitButtonText(): string {
    return 'Kirim Request';
  }

  get maxFiles(): number {
    return MAX_FILES;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.selectedFiles.forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
  }
}
