import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { EmployeesService } from '../employees.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  Employee,
  EmploymentStatus,
  Gender,
  MaritalStatus,
  EMPLOYMENT_STATUS_COLORS,
  EMPLOYMENT_STATUS_LABELS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS
} from '../employees.model';

/**
 * Employee Detail Page
 * Displays detailed information about a single employee
 */
@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './employee-detail.page.html',
  styleUrls: ['./employee-detail.page.scss']
})
export class EmployeeDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private employeesService = inject(EmployeesService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  employee: Employee | null = null;
  loading = true;
  error: string | null = null;

  private subscriptions: Subscription[] = [];

  // Display labels
  readonly EMPLOYMENT_STATUS_LABELS = EMPLOYMENT_STATUS_LABELS;
  readonly GENDER_LABELS = GENDER_LABELS;
  readonly MARITAL_STATUS_LABELS = MARITAL_STATUS_LABELS;

  ngOnInit(): void {
    this.loadEmployee();
  }

  /**
   * Load employee data
   */
  private loadEmployee(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID Karyawan tidak diberikan';
      this.loading = false;
      return;
    }

    this.loadingService.show({ message: 'Memuat detail karyawan...' });

    this.subscriptions.push(
      this.employeesService.getById(id).subscribe({
        next: (employee) => {
          this.loadingService.dismiss();
          if (employee) {
            this.employee = employee;
            this.loading = false;
          } else {
            this.error = 'Karyawan tidak ditemukan';
            this.loading = false;
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.error = 'Gagal memuat detail karyawan';
          this.loading = false;
          console.error('Error loading employee:', error);
        }
      })
    );
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(): void {
    if (this.employee) {
      this.router.navigate(['/admin/employees', this.employee.id, 'edit']);
    }
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/employees']);
  }

  /**
   * Toggle active status (activate / deactivate)
   */
  async toggleActiveStatus(): Promise<void> {
    if (!this.employee) return;

    const newStatus = !this.employee.isActive;
    const request$ = newStatus
      ? this.employeesService.activate(this.employee.id)
      : this.employeesService.deactivate(this.employee.id);

    this.subscriptions.push(
      request$.subscribe({
        next: (updated) => {
          if (updated) {
            this.employee = updated;
            this.toastService.success(`Karyawan berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
          }
        },
        error: (error) => {
          console.error('Error updating employee status:', error);
          this.toastService.error(`Gagal ${newStatus ? 'mengaktifkan' : 'menonaktifkan'} karyawan`);
        }
      })
    );
  }

  /**
   * Show delete confirmation
   */
  async confirmDelete(): Promise<void> {
    if (!this.employee) return;

    const alert = await this.alertController.create({
      header: 'Hapus Karyawan',
      message: `Apakah Anda yakin ingin menghapus "${this.employee.firstName} ${this.employee.lastName}"? Tindakan ini tidak dapat dibatalkan.`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: () => {
            this.handleDelete();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Handle delete
   */
  private handleDelete(): void {
    if (!this.employee) return;

    this.loadingService.show({ message: 'Menghapus karyawan...' });

    this.subscriptions.push(
      this.employeesService.delete(this.employee.id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Karyawan berhasil dihapus');
          this.router.navigate(['/admin/employees']);
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
   * Join non-empty address parts (city, province) with a comma separator
   */
  joinLocation(city?: string, province?: string): string {
    return [city, province].filter((value) => !!value).join(', ');
  }

  /**
   * Format date for display
   */
  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get active status color
   */
  getStatusColor(): string {
    return this.employee?.isActive ? 'success' : 'medium';
  }

  /**
   * Get active status text
   */
  getStatusText(): string {
    return this.employee?.isActive ? 'Aktif' : 'Tidak Aktif';
  }

  /**
   * Get employment status color
   */
  getEmploymentStatusColor(): string {
    const status = this.employee?.employmentStatus || EmploymentStatus.ACTIVE;
    return EMPLOYMENT_STATUS_COLORS[status] || 'medium';
  }

  /**
   * Get gender color
   */
  getGenderColor(): string {
    const colorMap: Record<Gender, string> = {
      [Gender.MALE]: 'primary',
      [Gender.FEMALE]: 'secondary',
      [Gender.OTHER]: 'tertiary'
    };
    return this.employee?.gender ? colorMap[this.employee.gender] : 'medium';
  }

  /**
   * Get marital status color
   */
  getMaritalStatusColor(): string {
    const colorMap: Record<MaritalStatus, string> = {
      [MaritalStatus.SINGLE]: 'primary',
      [MaritalStatus.MARRIED]: 'success',
      [MaritalStatus.DIVORCED]: 'warning',
      [MaritalStatus.WIDOWED]: 'medium'
    };
    return this.employee?.maritalStatus ? colorMap[this.employee.maritalStatus] : 'medium';
  }

  /**
   * Get full name
   */
  getFullName(): string {
    if (!this.employee) return '-';
    return `${this.employee.firstName} ${this.employee.lastName}`;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
