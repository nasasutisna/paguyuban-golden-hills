import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { IonicModule, RefresherCustomEvent, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { EmployeesService } from './employees.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  Employee,
  EmployeeStatistics,
  EmploymentStatus,
  Gender,
  MaritalStatus,
  EMPLOYMENT_STATUS_COLORS,
  EMPLOYMENT_STATUS_LABELS,
  GENDER_COLORS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS
} from './employees.model';
import { TableConfig, TableAction, TableDataSource } from '@shared/ui/table/table.model';
import { TableComponent } from '@shared/ui/table/table.component';

/**
 * Employees List Page
 * Displays statistics cards and table of employees with CRUD operations
 */
@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, IonicModule, TableComponent],
  templateUrl: './employees.page.html',
  styleUrls: ['./employees.page.scss']
})
export class EmployeesPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private employeesService = inject(EmployeesService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  // Data
  employees: Employee[] = [];
  employeeStats: EmployeeStatistics | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  // Loading states
  loading = true;
  statsLoading = true;

  // Table configuration
  tableConfig: TableConfig = {
    columns: [
      { key: 'employeeCode', header: 'Kode', type: 'text', sortable: true },
      { key: 'firstName', header: 'Nama Depan', type: 'text', sortable: true },
      { key: 'lastName', header: 'Nama Belakang', type: 'text', sortable: true },
      { key: 'position.positionName', header: 'Jabatan', type: 'text' },
      { key: 'email', header: 'Email', type: 'text' },
      { key: 'phoneNumber', header: 'Telepon', type: 'text' },
      { key: 'employmentStatus', header: 'Status Kepegawaian', type: 'status', sortable: true },
      { key: 'isActive', header: 'Status', type: 'status', sortable: true },
      { key: 'createdAt', header: 'Dibuat', type: 'date', sortable: true }
    ],
    actions: [
      {
        id: 'view',
        label: 'Lihat',
        icon: 'eye-outline',
        color: 'medium',
        handler: (item) => this.navigateToView(item)
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: 'create',
        color: 'primary',
        handler: (item) => this.navigateToEdit(item)
      },
      {
        id: 'delete',
        label: 'Hapus',
        icon: 'trash-outline',
        color: 'danger',
        handler: (item) => this.confirmDelete(item),
        confirm: {
          title: 'Hapus Karyawan',
          message: 'Apakah Anda yakin ingin menghapus karyawan ini? Tindakan ini tidak dapat dibatalkan.',
          confirmText: 'Hapus',
          cancelText: 'Batal'
        }
      }
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
    emptyMessage: 'Tidak ada karyawan ditemukan',
    loadingMessage: 'Memuat karyawan...'
  };

  // Table data source
  dataSource: TableDataSource<Employee> = {
    data: [],
    loading: false
  };

  // Status badges for table
  statusBadges = [
    { value: true, label: 'Aktif', color: 'success', icon: 'checkmark-circle' },
    { value: false, label: 'Tidak Aktif', color: 'medium', icon: 'close-circle' },
    { value: EmploymentStatus.ACTIVE, label: EMPLOYMENT_STATUS_LABELS[EmploymentStatus.ACTIVE], color: EMPLOYMENT_STATUS_COLORS[EmploymentStatus.ACTIVE] },
    { value: EmploymentStatus.PROBATION, label: EMPLOYMENT_STATUS_LABELS[EmploymentStatus.PROBATION], color: EMPLOYMENT_STATUS_COLORS[EmploymentStatus.PROBATION] },
    { value: EmploymentStatus.RESIGNED, label: EMPLOYMENT_STATUS_LABELS[EmploymentStatus.RESIGNED], color: EMPLOYMENT_STATUS_COLORS[EmploymentStatus.RESIGNED] },
    { value: EmploymentStatus.TERMINATED, label: EMPLOYMENT_STATUS_LABELS[EmploymentStatus.TERMINATED], color: EMPLOYMENT_STATUS_COLORS[EmploymentStatus.TERMINATED] },
    { value: Gender.MALE, label: GENDER_LABELS[Gender.MALE], color: GENDER_COLORS[Gender.MALE] },
    { value: Gender.FEMALE, label: GENDER_LABELS[Gender.FEMALE], color: GENDER_COLORS[Gender.FEMALE] },
    { value: Gender.OTHER, label: GENDER_LABELS[Gender.OTHER], color: GENDER_COLORS[Gender.OTHER] },
    { value: MaritalStatus.SINGLE, label: MARITAL_STATUS_LABELS[MaritalStatus.SINGLE], color: 'primary' },
    { value: MaritalStatus.MARRIED, label: MARITAL_STATUS_LABELS[MaritalStatus.MARRIED], color: 'success' },
    { value: MaritalStatus.DIVORCED, label: MARITAL_STATUS_LABELS[MaritalStatus.DIVORCED], color: 'warning' },
    { value: MaritalStatus.WIDOWED, label: MARITAL_STATUS_LABELS[MaritalStatus.WIDOWED], color: 'medium' }
  ];

  private subscriptions: Subscription[] = [];

  constructor() { }

  ngOnInit(): void {
    this.loadAllData();

    // Listen for router navigation events to reload data when returning to this page
    this.subscriptions.push(
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        // Reload data when navigating to the employees page
        if (event.url === '/admin/employees' || event.urlAfterRedirects === '/admin/employees') {
          this.loadAllData();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Load all data (stats and list)
   */
  private loadAllData(): void {
    this.loading = true;
    this.loadEmployeeStatistics();
    this.loadEmployees();
  }

  /**
   * Load employee statistics
   */
  private loadEmployeeStatistics(): void {
    this.statsLoading = true;

    this.subscriptions.push(
      this.employeesService.getStatistics().subscribe({
        next: (stats) => {
          this.employeeStats = stats;
          this.statsLoading = false;
        },
        error: (error) => {
          console.error('Error loading employee statistics:', error);
          this.statsLoading = false;
        }
      })
    );
  }

  /**
   * Load employees list
   */
  loadEmployees(): void {
    this.dataSource.loading = true;

    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const
    };

    this.subscriptions.push(
      this.employeesService.getAll(params).subscribe({
        next: (response) => {
          this.employees = response.data;
          this.dataSource = {
            data: response.data,
            loading: false,
            total: response.total,
            totalPages: response.totalPages
          };
          this.totalItems = response.total || 0;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading employees:', error);
          this.toastService.error('Gagal memuat karyawan');
          this.dataSource = {
            data: [],
            loading: false,
            total: 0
          };
          this.loading = false;
        }
      })
    );
  }

  /**
   * Handle pull to refresh
   */
  handleRefresh(event: RefresherCustomEvent): void {
    this.loadAllData();

    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  /**
   * Navigate to create page
   */
  navigateToCreate(): void {
    this.router.navigate(['/admin/employees/new']);
  }

  /**
   * Navigate to detail page
   */
  navigateToView(item: Employee): void {
    this.router.navigate(['/admin/employees', item.id]);
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(item: Employee): void {
    this.router.navigate(['/admin/employees', item.id, 'edit']);
  }

  /**
   * Show delete confirmation
   */
  async confirmDelete(item: Employee): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Hapus Karyawan',
      message: `Apakah Anda yakin ingin menghapus "${item.firstName} ${item.lastName}"? Tindakan ini tidak dapat dibatalkan.`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: () => {
            this.handleDelete(item.id);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Handle delete
   */
  private handleDelete(id: string): void {
    this.loadingService.show({ message: 'Menghapus karyawan...' });

    this.subscriptions.push(
      this.employeesService.delete(id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Karyawan berhasil dihapus');
          this.loadEmployees(); // Reload list
          this.loadEmployeeStatistics(); // Reload stats
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus karyawan');
          console.error('Delete employee error:', error);
        }
      })
    );
  }

  /**
   * Handle table action click
   */
  onAction(event: { action: TableAction; item: Employee }): void {
    if (event.action.handler) {
      event.action.handler(event.item);
    }
  }

  /**
   * Handle search/filter change
   */
  onFilterChange(filters: any[]): void {
    const searchFilter = filters.find((f) => f.column === 'search');
    if (searchFilter) {
      this.handleSearch(searchFilter.value);
    }
  }

  /**
   * Handle search
   */
  private handleSearch(query: string): void {
    if (!query || query.trim() === '') {
      this.loadEmployees();
      return;
    }

    this.dataSource.loading = true;

    const params = {
      page: 1,
      limit: this.pageSize,
      search: query.trim(),
      searchFields: 'employeeCode,firstName,lastName,email,phoneNumber'
    };

    this.subscriptions.push(
      this.employeesService.getAll(params).subscribe({
        next: (response) => {
          this.employees = response.data;
          this.dataSource = {
            data: response.data,
            loading: false,
            total: response.total,
            totalPages: response.totalPages
          };
          this.totalItems = response.total || 0;
          this.currentPage = 1;
        },
        error: (error) => {
          console.error('Error searching employees:', error);
          this.dataSource = {
            data: [],
            loading: false,
            total: 0,
            totalPages: 0
          };
        }
      })
    );
  }

  /**
   * Handle pagination change
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadEmployees();
  }

  /**
   * Total inactive employees (resigned + terminated) for stat card
   */
  get inactiveCount(): number {
    if (!this.employeeStats) return 0;
    return this.employeeStats.resignedEmployees + this.employeeStats.terminatedEmployees;
  }

  /**
   * Check if stats are loaded
   */
  hasStats(): boolean {
    return this.employeeStats !== null;
  }

  /**
   * Check if there are any employees
   */
  hasEmployees(): boolean {
    return this.employees.length > 0;
  }
}
