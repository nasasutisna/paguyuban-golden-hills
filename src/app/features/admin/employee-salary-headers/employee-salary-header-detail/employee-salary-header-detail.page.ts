import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { EmployeeSalaryHeadersService } from '../employee-salary-headers.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import {
  EmployeeSalaryHeader,
  PayrollStatus,
  PAYROLL_STATUS_LABELS,
  PAYROLL_STATUS_COLORS,
} from '../employee-salary-headers.model';

/**
 * Penggajian — detail of a single payroll, including the linked Kas IPL expense.
 */
@Component({
  selector: 'app-employee-salary-header-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './employee-salary-header-detail.page.html',
  styleUrls: ['./employee-salary-header-detail.page.scss'],
})
export class EmployeeSalaryHeaderDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salaryHeadersService = inject(EmployeeSalaryHeadersService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private alertController = inject(AlertController);

  payroll: EmployeeSalaryHeader | null = null;
  loading = true;
  notFound = false;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toastService.error('ID penggajian tidak ditemukan');
      this.goBack();
      return;
    }
    this.loadDetail(id);

    // Refresh if navigated here again with a different id.
    this.subscriptions.push(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => {
          const newId = this.route.snapshot.paramMap.get('id');
          if (newId && (!this.payroll || this.payroll.id !== newId)) {
            this.loadDetail(newId);
          }
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private async loadDetail(id: string) {
    this.loading = true;
    this.notFound = false;

    this.subscriptions.push(
      this.salaryHeadersService.getById(id).subscribe({
        next: (payroll) => {
          this.loading = false;
          if (payroll) {
            this.payroll = payroll;
          } else {
            this.notFound = true;
            this.toastService.error('Data penggajian tidak ditemukan');
          }
        },
        error: (error) => {
          this.loading = false;
          this.notFound = true;
          this.toastService.error('Gagal memuat detail penggajian');
          console.error('Load payroll detail error:', error);
        },
      }),
    );
  }

  goBack(): void {
    this.router.navigate(['/admin/employee-salary-headers']);
  }

  formatCurrency(value?: number | null): string {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  get statusLabel(): string {
    return this.payroll
      ? PAYROLL_STATUS_LABELS[this.payroll.status as PayrollStatus] || this.payroll.status
      : '';
  }

  get statusColor(): string {
    return this.payroll
      ? PAYROLL_STATUS_COLORS[this.payroll.status as PayrollStatus] || 'medium'
      : 'medium';
  }

  get employeeName(): string {
    if (this.payroll?.employeeName) return this.payroll.employeeName;
    if (this.payroll?.employee) {
      return `${this.payroll.employee.firstName || ''} ${this.payroll.employee.lastName || ''}`.trim() || '-';
    }
    return '-';
  }

  get hasCashTransaction(): boolean {
    return !!this.payroll?.cashTransaction;
  }

  get canCancel(): boolean {
    return this.payroll?.status === PayrollStatus.PAID;
  }

  async confirmCancel(): Promise<void> {
    if (!this.payroll || !this.canCancel) return;
    const name = this.employeeName;
    const amount = this.formatCurrency(this.payroll.netSalary);

    const alert = await this.alertController.create({
      header: 'Batalkan Pembayaran',
      message:
        `Yakin batalkan penggajian <strong>${name}</strong> ` +
        `(${this.payroll.payPeriod}, ${amount})? Transaksi Kas IPL akan dihapus dan saldo kembali.`,
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Alasan pembatalan (opsional)',
        },
      ],
      buttons: [
        { text: 'Tidak', role: 'cancel' },
        {
          text: 'Ya, Batalkan',
          role: 'destructive',
          handler: (data) => this.cancelPayroll(data?.reason),
        },
      ],
    });
    await alert.present();
  }

  private cancelPayroll(reason?: string): void {
    if (!this.payroll) return;
    const id = this.payroll.id;
    this.loadingService.show({ message: 'Membatalkan penggajian...' });
    this.subscriptions.push(
      this.salaryHeadersService.cancel(id, reason).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Penggajian dibatalkan. Transaksi Kas IPL dihapus.');
          this.loadDetail(id);
        },
        error: (error) => {
          this.loadingService.dismiss();
          const msg = error?.error?.message || 'Gagal membatalkan penggajian';
          this.toastService.error(msg);
          console.error('Cancel payroll error:', error);
        },
      }),
    );
  }
}
