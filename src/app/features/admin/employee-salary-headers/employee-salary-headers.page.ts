import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { EmployeeSalaryHeadersService } from './employee-salary-headers.service';
import { ToastService } from '@services/toast.service';
import {
  EmployeeSalaryHeader,
  PayrollStatus,
  PAYROLL_STATUS_LABELS,
  PAYROLL_STATUS_COLORS,
} from './employee-salary-headers.model';
import { TableConfig, TableAction, TableDataSource } from '@shared/ui/table/table.model';
import { TableComponent } from '@shared/ui/table/table.component';

/**
 * Penggajian — list riwayat penggajian (read-only).
 * Tombol "Bayar Gaji" membuka form gaji datar.
 */
@Component({
  selector: 'app-employee-salary-headers',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TableComponent],
  templateUrl: './employee-salary-headers.page.html',
  styleUrls: ['./employee-salary-headers.page.scss'],
})
export class EmployeeSalaryHeadersPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private salaryHeadersService = inject(EmployeeSalaryHeadersService);
  private toastService = inject(ToastService);

  payrollList: EmployeeSalaryHeader[] = [];
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  loading = true;

  // Period filter (YYYY-MM). Empty string = all periods.
  filterPeriod = '';
  private searchQuery = '';

  tableConfig: TableConfig = {
    columns: [
      { key: 'payrollNumber', header: 'No. Penggajian', type: 'text', sortable: true },
      { key: 'employeeName', header: 'Karyawan', type: 'text', sortable: true },
      { key: 'positionName', header: 'Jabatan', type: 'text' },
      { key: 'payPeriod', header: 'Periode', type: 'text', sortable: true },
      { key: 'netSalary', header: 'Gaji Dibayar', type: 'currency', align: 'right', sortable: true },
      { key: 'paymentDate', header: 'Tgl Bayar', type: 'date', sortable: true },
      { key: 'status', header: 'Status', type: 'status', sortable: true },
    ],
    actions: [
      {
        id: 'view',
        label: 'Lihat',
        icon: 'eye-outline',
        color: 'medium',
        handler: (item) => this.navigateToView(item),
      },
    ],
    sortable: false,
    filterable: true,
    pagination: true,
    pageSize: this.pageSize,
    pageSizeOptions: [10, 25, 50],
    showHeader: true,
    showFooter: true,
    striped: true,
    hoverable: true,
    emptyMessage: 'Belum ada riwayat penggajian',
    loadingMessage: 'Memuat penggajian...',
  };

  dataSource: TableDataSource<EmployeeSalaryHeader> = {
    data: [],
    loading: false,
  };

  statusBadges = [
    { value: PayrollStatus.DRAFT, label: PAYROLL_STATUS_LABELS[PayrollStatus.DRAFT], color: PAYROLL_STATUS_COLORS[PayrollStatus.DRAFT] },
    { value: PayrollStatus.CALCULATED, label: PAYROLL_STATUS_LABELS[PayrollStatus.CALCULATED], color: PAYROLL_STATUS_COLORS[PayrollStatus.CALCULATED] },
    { value: PayrollStatus.APPROVED, label: PAYROLL_STATUS_LABELS[PayrollStatus.APPROVED], color: PAYROLL_STATUS_COLORS[PayrollStatus.APPROVED] },
    { value: PayrollStatus.PAID, label: PAYROLL_STATUS_LABELS[PayrollStatus.PAID], color: PAYROLL_STATUS_COLORS[PayrollStatus.PAID] },
    { value: PayrollStatus.CANCELLED, label: PAYROLL_STATUS_LABELS[PayrollStatus.CANCELLED], color: PAYROLL_STATUS_COLORS[PayrollStatus.CANCELLED] },
  ];

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.loadPayroll();

    // Reload when returning from the form.
    this.subscriptions.push(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          if (
            event.url === '/admin/employee-salary-headers' ||
            event.urlAfterRedirects === '/admin/employee-salary-headers'
          ) {
            this.loadPayroll();
          }
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  loadPayroll(): void {
    this.dataSource.loading = true;
    const params = this.buildParams();

    this.subscriptions.push(
      this.salaryHeadersService.getAll(params).subscribe({
        next: (response) => {
          this.payrollList = response.data;
          this.dataSource = {
            data: response.data,
            loading: false,
            total: response.total,
            totalPages: response.totalPages,
          };
          this.totalItems = response.total || 0;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading payroll:', error);
          this.toastService.error('Gagal memuat penggajian');
          this.dataSource = { data: [], loading: false, total: 0 };
          this.loading = false;
        },
      }),
    );
  }

  /** Merge pagination + active filters (search, period) into query params. */
  private buildParams(page: number = this.currentPage): any {
    const params: any = {
      page,
      limit: this.pageSize,
      sortBy: 'payPeriod',
      sortOrder: 'desc',
    };
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.filterPeriod) params.payPeriod = this.filterPeriod.trim();
    return params;
  }

  handleRefresh(event: RefresherCustomEvent): void {
    this.loadPayroll();
    setTimeout(() => event.target.complete(), 800);
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin/employee-salary-headers/new']);
  }

  navigateToView(item: EmployeeSalaryHeader): void {
    this.router.navigate(['/admin/employee-salary-headers', item.id]);
  }

  onAction(event: { action: TableAction; item: EmployeeSalaryHeader }): void {
    if (event.action.handler) {
      event.action.handler(event.item);
    }
  }

  /** Apply the period filter (called from the filter bar). */
  applyPeriodFilter(): void {
    const value = (this.filterPeriod || '').trim();
    if (value && !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      this.toastService.warning('Format periode: YYYY-MM (contoh: 2026-07)');
      return;
    }
    this.filterPeriod = value;
    this.currentPage = 1;
    this.loadPayroll();
  }

  clearPeriodFilter(): void {
    this.filterPeriod = '';
    this.currentPage = 1;
    this.loadPayroll();
  }

  get hasActiveFilter(): boolean {
    return !!this.filterPeriod || !!this.searchQuery;
  }

  onFilterChange(filters: any[]): void {
    const searchFilter = filters.find((f) => f.column === 'search');
    this.searchQuery = searchFilter?.value ? searchFilter.value.trim() : '';
    this.currentPage = 1;
    this.dataSource.loading = true;
    this.subscriptions.push(
      this.salaryHeadersService.getAll(this.buildParams(1)).subscribe({
        next: (response) => {
          this.payrollList = response.data;
          this.dataSource = {
            data: response.data,
            loading: false,
            total: response.total,
            totalPages: response.totalPages,
          };
          this.totalItems = response.total || 0;
        },
        error: () => {
          this.dataSource = { data: [], loading: false, total: 0, totalPages: 0 };
        },
      }),
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadPayroll();
  }

  hasData(): boolean {
    return this.payrollList.length > 0;
  }
}
