import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { IonicModule, RefresherCustomEvent, ModalController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UsersService } from './users.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { User, ROLE_COLORS } from './users.model';
import { TableConfig, TableAction, TableDataSource } from '@shared/ui/table/table.model';
import { TableComponent } from '@shared/ui/table/table.component';
import { ResetPasswordModalComponent } from './reset-password-modal/reset-password-modal.component';

/**
 * Users List Page
 * Admin management of user accounts: list + search + pagination,
 * with activate/deactivate, reset-password, and delete actions.
 */
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, IonicModule, TableComponent],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private usersService = inject(UsersService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private modalController = inject(ModalController);
  private alertController = inject(AlertController);

  users: User[] = [];
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  loading = true;
  searchQuery = '';

  tableConfig: TableConfig = {
    columns: [
      { key: 'username', header: 'Username', type: 'text', sortable: true, cardTitle: true },
      { key: 'firstName', header: 'Nama', type: 'text', sortable: true },
      { key: 'email', header: 'Email', type: 'text' },
      { key: 'role.name', header: 'Role', type: 'status', sortable: true, cardStatus: true },
      { key: 'phoneNumber', header: 'Telepon', type: 'text', cardHidden: true },
      { key: 'resident.residentCode', header: 'Kode Warga', type: 'text', cardHidden: true },
      { key: 'isActive', header: 'Status', type: 'status', sortable: true },
      { key: 'createdAt', header: 'Dibuat', type: 'date', sortable: true, cardHidden: true },
    ],
    actions: [
      { id: 'view', label: 'Lihat', icon: 'eye-outline', color: 'medium', handler: (item) => this.navigateToView(item) },
      { id: 'edit', label: 'Edit', icon: 'create', color: 'primary', handler: (item) => this.navigateToEdit(item) },
      { id: 'password', label: 'Reset Password', icon: 'key-outline', color: 'warning', handler: (item) => this.openResetPassword(item) },
      {
        id: 'deactivate', label: 'Nonaktifkan', icon: 'pause-circle-outline', color: 'medium',
        show: (item) => !!item.isActive,
        handler: (item) => this.confirmToggleActive(item, false),
      },
      {
        id: 'activate', label: 'Aktifkan', icon: 'play-circle-outline', color: 'success',
        show: (item) => !item.isActive,
        handler: (item) => this.confirmToggleActive(item, true),
      },
      {
        id: 'delete', label: 'Hapus', icon: 'trash-outline', color: 'danger',
        handler: (item) => this.confirmDelete(item),
        confirm: {
          title: 'Hapus Pengguna',
          message: 'Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.',
          confirmText: 'Hapus',
          cancelText: 'Batal',
        },
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
    emptyMessage: 'Tidak ada pengguna ditemukan',
    loadingMessage: 'Memuat pengguna...',
  };

  dataSource: TableDataSource<User> = { data: [], loading: false };

  /** Status badges: active flag + known role names */
  statusBadges = [
    { value: true, label: 'Aktif', color: 'success', icon: 'checkmark-circle' },
    { value: false, label: 'Nonaktif', color: 'medium', icon: 'close-circle' },
    ...Object.entries(ROLE_COLORS).map(([name, color]) => ({
      value: name,
      label: name,
      color,
    })),
  ];

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.loadUsers();
    this.subscriptions.push(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => {
          if (event.url === '/admin/users' || event.urlAfterRedirects === '/admin/users') {
            this.loadUsers();
          }
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  loadUsers(): void {
    this.dataSource.loading = true;
    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
      ...(this.searchQuery.trim()
        ? { search: this.searchQuery.trim(), searchFields: 'username,firstName,lastName,email' }
        : {}),
    };

    this.subscriptions.push(
      this.usersService.getAll(params).subscribe({
        next: (response) => {
          this.users = response.data;
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
          console.error('Error loading users:', error);
          this.toastService.error('Gagal memuat pengguna');
          this.dataSource = { data: [], loading: false, total: 0 };
          this.loading = false;
        },
      }),
    );
  }

  handleRefresh(event: RefresherCustomEvent): void {
    this.loadUsers();
    setTimeout(() => event.target.complete(), 800);
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin/users/new']);
  }

  navigateToView(item: User): void {
    this.router.navigate(['/admin/users', item.id]);
  }

  navigateToEdit(item: User): void {
    this.router.navigate(['/admin/users', item.id, 'edit']);
  }

  onAction(event: { action: TableAction; item: User }): void {
    event.action.handler?.(event.item);
  }

  onFilterChange(filters: any[]): void {
    const searchFilter = filters.find((f) => f.column === 'search');
    this.searchQuery = searchFilter?.value ?? '';
    this.currentPage = 1;
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  /** Open the reset-password modal for a user */
  async openResetPassword(item: User): Promise<void> {
    const modal = await this.modalController.create({
      component: ResetPasswordModalComponent,
      componentProps: { user: item },
    });
    await modal.present();
  }

  /** Confirm then activate/deactivate */
  async confirmToggleActive(item: User, activate: boolean): Promise<void> {
    const alert = await this.alertController.create({
      header: activate ? 'Aktifkan Pengguna' : 'Nonaktifkan Pengguna',
      message: activate
        ? `Aktifkan akun "${item.username}"?`
        : `Nonaktifkan akun "${item.username}"? Pengguna tidak dapat login saat nonaktif.`,
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: activate ? 'Aktifkan' : 'Nonaktifkan',
          role: activate ? 'confirm' : 'destructive',
          handler: () => this.handleToggleActive(item.id, activate),
        },
      ],
    });
    await alert.present();
  }

  private handleToggleActive(id: string, activate: boolean): void {
    this.loadingService.show({ message: activate ? 'Mengaktifkan...' : 'Menonaktifkan...' });
    const obs = activate ? this.usersService.activate(id) : this.usersService.deactivate(id);
    this.subscriptions.push(
      obs.subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success(activate ? 'Pengguna diaktifkan' : 'Pengguna dinonaktifkan');
          this.loadUsers();
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal mengubah status pengguna');
          console.error('Toggle active error:', error);
        },
      }),
    );
  }

  async confirmDelete(item: User): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Hapus Pengguna',
      message: `Apakah Anda yakin ingin menghapus "${item.username}"?`,
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: () => this.handleDelete(item.id),
        },
      ],
    });
    await alert.present();
  }

  private handleDelete(id: string): void {
    this.loadingService.show({ message: 'Menghapus pengguna...' });
    this.subscriptions.push(
      this.usersService.delete(id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Pengguna berhasil dihapus');
          this.loadUsers();
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus pengguna');
          console.error('Delete user error:', error);
        },
      }),
    );
  }
}
