import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IonicModule, AlertController } from '@ionic/angular';
import { TableComponent } from '@shared/ui/table/table.component';
import { TableAction, TableConfig, TableDataSource } from '@shared/ui/table/table.model';
import { ExpenseRequestsService } from './expense-requests.service';
import { AuthService } from '@core/auth/auth.service';
import {
  ExpenseRequest,
  ExpenseRequestStatus,
  EXPENSE_REQUEST_STATUS_LABELS,
  EXPENSE_REQUEST_STATUS_COLORS,
  ExpenseRequestQueryParams,
} from './expense-requests.model';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';

type ViewMode = 'all' | 'mine';

/**
 * Expense Requests List Page
 *
 * Multi-role behaviour (backend is the authorization source of truth):
 *  - ADMIN/ACCOUNTANT/SUPERADMIN/MANAGER -> can view ALL requests
 *  - ADMIN/ACCOUNTANT/SUPERADMIN         -> can approve / reject
 *  - PENGURUS/COORDINATOR/ADMIN/ACCOUNTANT/SUPERADMIN -> can create
 *  - everyone else                        -> sees only their own (getMine)
 */
@Component({
  selector: 'app-expense-requests',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TableComponent],
  templateUrl: './expense-requests.page.html',
  styleUrls: ['./expense-requests.page.scss'],
})
export class ExpenseRequestsPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private expenseRequestsService = inject(ExpenseRequestsService);
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  requests: ExpenseRequest[] = [];
  currentPage = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;

  // Role-based flags
  private role = '';
  canViewAll = false;
  canApproveAction = false;
  canCreate = false;

  // View state
  viewMode: ViewMode = 'mine';
  statusFilter: ExpenseRequestStatus | '' = '';

  // Table
  dataSource: TableDataSource<ExpenseRequest> = { data: [], loading: false };
  tableConfig!: TableConfig;

  readonly statusBadges = [
    { value: ExpenseRequestStatus.PENDING, label: 'Menunggu', color: 'warning', icon: 'time-outline' },
    { value: ExpenseRequestStatus.APPROVED, label: 'Disetujui', color: 'success', icon: 'checkmark-circle' },
    { value: ExpenseRequestStatus.REJECTED, label: 'Ditolak', color: 'danger', icon: 'close-circle' },
    { value: ExpenseRequestStatus.CANCELLED, label: 'Dibatalkan', color: 'medium', icon: 'close-circle' },
  ];

  readonly STATUS_LABELS = EXPENSE_REQUEST_STATUS_LABELS;
  readonly STATUS_COLORS = EXPENSE_REQUEST_STATUS_COLORS;
  readonly ExpenseRequestStatus = ExpenseRequestStatus;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Resolve role once auth state is available.
    this.subscriptions.push(
      this.authService.authState.subscribe((state) => {
        this.role = state.user?.role?.name || '';
        this.canViewAll = ['ADMIN', 'ACCOUNTANT', 'MANAGER', 'SUPERADMIN'].includes(this.role);
        this.canApproveAction = ['ADMIN', 'ACCOUNTANT', 'SUPERADMIN'].includes(this.role);
        this.canCreate = ['PENGURUS', 'COORDINATOR', 'ADMIN', 'ACCOUNTANT', 'SUPERADMIN'].includes(this.role);
        this.viewMode = this.canViewAll ? 'all' : 'mine';
      })
    );

    this.tableConfig = {
      columns: [
        { key: 'requestNumber', header: 'No. Request', type: 'text', sortable: true },
        { key: 'title', header: 'Judul', type: 'text' },
        { key: 'requesterName', header: 'Pemohon', type: 'text' },
        { key: 'categoryName', header: 'Kategori', type: 'text' },
        { key: 'transactionDate', header: 'Tanggal', type: 'date', sortable: true },
        { key: 'amount', header: 'Jumlah', type: 'currency', align: 'right' },
        { key: 'status', header: 'Status', type: 'status', sortable: true },
      ],
      actions: [
        {
          id: 'view',
          label: 'Lihat',
          icon: 'eye-outline',
          color: 'medium',
          handler: (item: any) => this.navigateToDetail(item.id),
        },
        {
          id: 'approve',
          label: 'Setujui',
          icon: 'checkmark-outline',
          color: 'success',
          show: (item: any) => this.canApproveAction && this.isPending(item),
          handler: (item: any) => this.quickApprove(item),
        },
        {
          id: 'reject',
          label: 'Tolak',
          icon: 'close-outline',
          color: 'danger',
          show: (item: any) => this.canApproveAction && this.isPending(item),
          handler: (item: any) => this.quickReject(item),
        },
      ],
      sortable: false,
      filterable: true,
      pagination: true,
      pageSize: this.pageSize,
      pageSizeOptions: [10, 25, 50],
      showHeader: true,
      striped: true,
      hoverable: true,
      emptyMessage: 'Belum ada request pengeluaran',
      loadingMessage: 'Memuat data...',
    };

    this.loadRequests();
  }

  /** Load requests based on viewMode + filters. */
  loadRequests(): void {
    this.dataSource.loading = true;

    const params: ExpenseRequestQueryParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };
    if (this.statusFilter) params.status = this.statusFilter;

    const source$ = this.viewMode === 'all' && this.canViewAll
      ? this.expenseRequestsService.getAll(params)
      : this.expenseRequestsService.getMine(params);

    this.subscriptions.push(
      source$.subscribe({
        next: (response) => {
          this.requests = response.data;
          this.dataSource = {
            data: this.transformRows(response.data),
            loading: false,
            total: response.total,
            totalPages: response.totalPages,
          };
          this.total = response.total || 0;
          this.totalPages = response.totalPages || 0;
        },
        error: (error) => {
          this.toastService.error('Gagal memuat request pengeluaran');
          this.dataSource = { data: [], loading: false, total: 0 };
          console.error('Error loading expense requests:', error);
        },
      })
    );
  }

  /** Flatten relations + coerce Decimal amount for table cells. */
  private transformRows(rows: ExpenseRequest[]): any[] {
    return rows.map((r) => ({
      ...r,
      amount: Number(r.amount) || 0,
      requesterName: this.getRequesterName(r),
      categoryName: r.category?.categoryName || '-',
    }));
  }

  // ----------------------------------------------------------------
  // Navigation
  // ----------------------------------------------------------------

  navigateToCreate(): void {
    this.router.navigate(['/expense-requests/new']);
  }

  navigateToDetail(id: string): void {
    this.router.navigate(['/expense-requests', id]);
  }

  // ----------------------------------------------------------------
  // Filters
  // ----------------------------------------------------------------

  onStatusFilterChange(status: any): void {
    this.statusFilter = status || '';
    this.currentPage = 1;
    this.loadRequests();
  }

  onViewModeChange(mode: any): void {
    this.viewMode = (mode as ViewMode) || 'mine';
    this.currentPage = 1;
    this.loadRequests();
  }

  onAction(event: { action: TableAction; item: ExpenseRequest }): void {
    if (event.action.handler) {
      event.action.handler(event.item);
    }
  }

  onFilterChange(filters: any[]): void {
    const searchFilter = filters.find((f) => f.column === 'search');
    this.handleSearch(searchFilter?.value || '');
  }

  private handleSearch(query: string): void {
    this.dataSource.loading = true;
    const params: ExpenseRequestQueryParams = {
      page: 1,
      limit: this.pageSize,
      search: query?.trim() || undefined,
    };
    if (this.statusFilter) params.status = this.statusFilter;

    const source$ = this.viewMode === 'all' && this.canViewAll
      ? this.expenseRequestsService.getAll(params)
      : this.expenseRequestsService.getMine(params);

    this.subscriptions.push(
      source$.subscribe({
        next: (response) => {
          this.requests = response.data;
          this.dataSource = {
            data: this.transformRows(response.data),
            loading: false,
            total: response.total,
            totalPages: response.totalPages,
          };
          this.total = response.total || 0;
          this.currentPage = 1;
        },
        error: () => {
          this.dataSource = { data: [], loading: false, total: 0 };
        },
      })
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRequests();
  }

  // ----------------------------------------------------------------
  // Quick approve / reject (from list)
  // ----------------------------------------------------------------

  async quickApprove(request: ExpenseRequest): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Setujui Request',
      message: `Setujui request ${request.requestNumber} — "${request.title}"?`,
      inputs: [{ name: 'comments', type: 'textarea', placeholder: 'Catatan (opsional)' }],
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Setujui',
          handler: (data) => {
            this.handleApprove(request.id, data.comments || '');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async quickReject(request: ExpenseRequest): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Tolak Request',
      message: `Tolak request ${request.requestNumber} — "${request.title}"?`,
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Alasan penolakan *', value: '' }],
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Tolak',
          role: 'destructive',
          handler: (data) => {
            if (!data.reason || data.reason.trim() === '') {
              this.toastService.error('Alasan penolakan wajib diisi');
              return false;
            }
            this.handleReject(request.id, data.reason);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private handleApprove(id: string, comments: string): void {
    this.loadingService.show({ message: 'Menyetujui request...' });
    this.subscriptions.push(
      this.expenseRequestsService.approve(id, { comments }).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Request disetujui & diposting ke kas');
          this.loadRequests();
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menyetujui request');
          console.error('Approve error:', error);
        },
      })
    );
  }

  private handleReject(id: string, reason: string): void {
    this.loadingService.show({ message: 'Menolak request...' });
    this.subscriptions.push(
      this.expenseRequestsService.reject(id, { reason }).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Request ditolak');
          this.loadRequests();
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menolak request');
          console.error('Reject error:', error);
        },
      })
    );
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  isPending(request: ExpenseRequest): boolean {
    return request?.status === ExpenseRequestStatus.PENDING;
  }

  getRequesterName(request: ExpenseRequest): string {
    const r = request.requester;
    if (!r) return '-';
    if (r.firstName || r.lastName) return `${r.firstName || ''} ${r.lastName || ''}`.trim();
    return r.username || '-';
  }

  get pendingCount(): number {
    return this.requests.filter((r) => r.status === ExpenseRequestStatus.PENDING).length;
  }

  get approvedCount(): number {
    return this.requests.filter((r) => r.status === ExpenseRequestStatus.APPROVED).length;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
