import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ResidentsService } from '../residents.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  Resident,
  Gender,
  MaritalStatus,
  OwnershipType,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
  OWNERSHIP_TYPE_LABELS
} from '../residents.model';

/**
 * Resident Detail Page
 * Displays detailed information about a single resident
 */
@Component({
  selector: 'app-resident-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './resident-detail.page.html',
  styleUrls: ['./resident-detail.page.scss']
})
export class ResidentDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private residentsService = inject(ResidentsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  resident: Resident | null = null;
  loading = true;
  error: string | null = null;

  private subscriptions: Subscription[] = [];

  // Display labels
  readonly GENDER_LABELS = GENDER_LABELS;
  readonly MARITAL_STATUS_LABELS = MARITAL_STATUS_LABELS;
  readonly OWNERSHIP_TYPE_LABELS = OWNERSHIP_TYPE_LABELS;

  ngOnInit(): void {
    this.loadResident();
  }

  /**
   * Load resident data
   */
  private loadResident(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID Warga tidak diberikan';
      this.loading = false;
      return;
    }

    this.loadingService.show({ message: 'Memuat detail warga...' });

    this.subscriptions.push(
      this.residentsService.getById(id).subscribe({
        next: (resident) => {
          this.loadingService.dismiss();
          if (resident) {
            this.resident = resident;
            this.loading = false;
          } else {
            this.error = 'Warga tidak ditemukan';
            this.loading = false;
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.error = 'Gagal memuat detail warga';
          this.loading = false;
          console.error('Error loading resident:', error);
        }
      })
    );
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(): void {
    if (this.resident) {
      this.router.navigate(['/admin/residents', this.resident.id, 'edit']);
    }
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/residents']);
  }

  /**
   * Toggle active status
   */
  async toggleActiveStatus(): Promise<void> {
    if (!this.resident) return;

    const newStatus = !this.resident.isActive;
    const statusText = newStatus ? 'activate' : 'deactivate';

    this.subscriptions.push(
      this.residentsService.update(this.resident.id, { isActive: newStatus }).subscribe({
        next: (updated) => {
          if (updated) {
            this.resident = updated;
            this.toastService.success(`Warga berhasil ${statusText}kan`);
          }
        },
        error: (error) => {
          console.error('Error updating resident status:', error);
          this.toastService.error(`Gagal ${statusText}kan warga`);
        }
      })
    );
  }

  /**
   * Show delete confirmation
   */
  async confirmDelete(): Promise<void> {
    if (!this.resident) return;

    const alert = await this.alertController.create({
      header: 'Hapus Warga',
      message: `Apakah Anda yakin ingin menghapus "${this.resident.firstName} ${this.resident.lastName}"? Tindakan ini tidak dapat dibatalkan.`,
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
    if (!this.resident) return;

    this.loadingService.show({ message: 'Menghapus warga...' });

    this.subscriptions.push(
      this.residentsService.delete(this.resident.id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Warga berhasil dihapus');
          this.router.navigate(['/admin/residents']);
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus warga');
          console.error('Delete resident error:', error);
        }
      })
    );
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
   * Get status color
   */
  getStatusColor(): string {
    return this.resident?.isActive ? 'success' : 'medium';
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    return this.resident?.isActive ? 'Aktif' : 'Tidak Aktif';
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
    return this.resident?.gender ? colorMap[this.resident.gender] : 'medium';
  }

  /**
   * Get ownership color
   */
  getOwnershipColor(): string {
    const colorMap: Record<OwnershipType, string> = {
      [OwnershipType.OWNER]: 'success',
      [OwnershipType.RENTER]: 'warning'
    };
    return colorMap[this.resident?.ownershipType || OwnershipType.OWNER];
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
    return this.resident?.maritalStatus ? colorMap[this.resident.maritalStatus] : 'medium';
  }

  /**
   * Get full name
   */
  getFullName(): string {
    if (!this.resident) return '-';
    return `${this.resident.firstName} ${this.resident.lastName}`;
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
