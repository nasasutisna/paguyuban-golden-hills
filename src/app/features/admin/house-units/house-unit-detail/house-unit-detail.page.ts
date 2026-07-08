import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { HouseUnitsService } from '../house-units.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  HouseUnit,
  OccupancyStatus,
  OCCUPANCY_STATUS_LABELS,
  OCCUPANCY_STATUS_COLORS,
  OCCUPANCY_IPL_PERCENTAGE
} from '../house-units.model';

/**
 * House Unit Detail Page
 * Displays detailed information about a single house unit
 */
@Component({
  selector: 'app-house-unit-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './house-unit-detail.page.html',
  styleUrls: ['./house-unit-detail.page.scss']
})
export class HouseUnitDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private houseUnitsService = inject(HouseUnitsService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  houseUnit: HouseUnit | null = null;
  loading = true;
  error: string | null = null;

  private subscriptions: Subscription[] = [];

  // Display labels
  readonly OCCUPANCY_STATUS_LABELS = OCCUPANCY_STATUS_LABELS;
  readonly OCCUPANCY_STATUS_COLORS = OCCUPANCY_STATUS_COLORS;
  readonly OCCUPANCY_IPL_PERCENTAGE = OCCUPANCY_IPL_PERCENTAGE;

  ngOnInit(): void {
    this.loadHouseUnit();
  }

  /**
   * Load house unit data
   */
  private loadHouseUnit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID Unit tidak ditemukan';
      this.loading = false;
      return;
    }

    this.loadingService.show({ message: 'Memuat detail unit...' });

    this.subscriptions.push(
      this.houseUnitsService.getById(id).subscribe({
        next: (unit) => {
          this.loadingService.dismiss();
          if (unit) {
            this.houseUnit = unit;
            this.loading = false;
          } else {
            this.error = 'Unit tidak ditemukan';
            this.loading = false;
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.error = 'Gagal memuat detail unit';
          this.loading = false;
          console.error('Error loading house unit:', error);
        }
      })
    );
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(): void {
    if (this.houseUnit) {
      this.router.navigate(['/admin/house-units', this.houseUnit.id, 'edit']);
    }
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/house-units']);
  }

  /**
   * Navigate to house block
   */
  navigateToHouseBlock(): void {
    if (this.houseUnit?.houseBlockId) {
      this.router.navigate(['/admin/house-blocks', this.houseUnit.houseBlockId]);
    }
  }

  /**
   * Toggle active status
   */
  async toggleActiveStatus(): Promise<void> {
    if (!this.houseUnit) return;

    const newStatus = !this.houseUnit.isActive;
    const statusText = newStatus ? 'aktifkan' : 'nonaktifkan';

    this.subscriptions.push(
      this.houseUnitsService.update(this.houseUnit.id, { isActive: newStatus }).subscribe({
        next: (updated) => {
          if (updated) {
            this.houseUnit = updated;
            this.toastService.success(`Unit berhasil ${statusText}`);
          }
        },
        error: (error) => {
          console.error('Error updating house unit status:', error);
          this.toastService.error(`Gagal ${statusText} unit`);
        }
      })
    );
  }

  /**
   * Change occupancy status
   */
  async changeOccupancyStatus(): Promise<void> {
    if (!this.houseUnit) return;

    const alert = await this.alertController.create({
      header: 'Ubah Status Hunian',
      message: 'Pilih status hunian baru untuk unit ini:',
      inputs: Object.values(OccupancyStatus).map((status) => ({
        type: 'radio',
        label: OCCUPANCY_STATUS_LABELS[status],
        value: status,
        checked: this.houseUnit?.occupancyStatus === status
      })),
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Simpan',
          handler: (selectedStatus: OccupancyStatus) => {
            if (selectedStatus) {
              this.updateOccupancyStatus(selectedStatus);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Update occupancy status
   */
  private updateOccupancyStatus(status: OccupancyStatus): void {
    if (!this.houseUnit) return;

    const newIplPercentage = OCCUPANCY_IPL_PERCENTAGE[status];

    this.subscriptions.push(
      this.houseUnitsService.update(this.houseUnit.id, {
        occupancyStatus: status,
        iplPercentage: newIplPercentage
      }).subscribe({
        next: (updated) => {
          if (updated) {
            this.houseUnit = updated;
            this.toastService.success(
              `Status hunian diubah menjadi ${OCCUPANCY_STATUS_LABELS[status]} (IPL: ${newIplPercentage}%)`
            );
          }
        },
        error: (error) => {
          console.error('Error updating occupancy status:', error);
          this.toastService.error('Gagal mengubah status hunian');
        }
      })
    );
  }

  /**
   * Toggle bank buyback status
   */
  async toggleBankBuyback(): Promise<void> {
    if (!this.houseUnit) return;

    const newStatus = !this.houseUnit.isBankBuyback;

    const alert = await this.alertController.create({
      header: newStatus ? 'Tandai Bank Buyback' : 'Hapus Status Bank Buyback',
      message: newStatus
        ? 'Apakah Anda yakin ingin menandai unit ini sebagai bank buyback?'
        : 'Apakah Anda yakin ingin menghapus status bank buyback dari unit ini?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Ya',
          handler: () => {
            this.updateBankBuybackStatus(newStatus);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Update bank buyback status
   */
  private updateBankBuybackStatus(isBuyback: boolean): void {
    if (!this.houseUnit) return;

    this.subscriptions.push(
      this.houseUnitsService.update(this.houseUnit.id, {
        isBankBuyback: isBuyback,
        buybackDate: isBuyback ? new Date().toISOString() : undefined
      }).subscribe({
        next: (updated) => {
          if (updated) {
            this.houseUnit = updated;
            this.toastService.success(
              isBuyback ? 'Unit ditandai sebagai bank buyback' : 'Status bank buyback dihapus'
            );
          }
        },
        error: (error) => {
          console.error('Error updating bank buyback status:', error);
          this.toastService.error('Gagal mengubah status bank buyback');
        }
      })
    );
  }

  /**
   * Show delete confirmation
   */
  async confirmDelete(): Promise<void> {
    if (!this.houseUnit) return;

    const alert = await this.alertController.create({
      header: 'Hapus Unit',
      message: `Apakah Anda yakin ingin menghapus "${this.houseUnit.unitCode}"? Tindakan ini tidak dapat dibatalkan.`,
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
    if (!this.houseUnit) return;

    this.loadingService.show({ message: 'Menghapus unit...' });

    this.subscriptions.push(
      this.houseUnitsService.delete(this.houseUnit.id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Unit berhasil dihapus');
          this.router.navigate(['/admin/house-units']);
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus unit');
          console.error('Delete house unit error:', error);
        }
      })
    );
  }

  /**
   * Format date for display (Indonesian locale)
   */
  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format area with m² unit
   */
  formatArea(area?: number): string {
    if (!area) return '-';
    return `${area.toLocaleString('id-ID')} m²`;
  }

  /**
   * Format IPL percentage
   */
  formatIplPercentage(): string {
    if (!this.houseUnit) return '-';
    return `${this.houseUnit.iplPercentage}%`;
  }

  /**
   * Get status color
   */
  getStatusColor(): string {
    return this.houseUnit?.isActive ? 'success' : 'medium';
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    return this.houseUnit?.isActive ? 'Aktif' : 'Tidak Aktif';
  }

  /**
   * Get occupancy status color
   */
  getOccupancyStatusColor(): string {
    return this.houseUnit?.occupancyStatus
      ? OCCUPANCY_STATUS_COLORS[this.houseUnit.occupancyStatus]
      : 'medium';
  }

  /**
   * Get occupancy status label
   */
  getOccupancyStatusLabel(): string {
    return this.houseUnit?.occupancyStatus
      ? OCCUPANCY_STATUS_LABELS[this.houseUnit.occupancyStatus]
      : '-';
  }

  /**
   * Check if unit has residents
   */
  hasResidents(): boolean {
    return !!(this.houseUnit?.residents && this.houseUnit.residents.length > 0);
  }

  /**
   * Get active residents only
   */
  getActiveResidents() {
    return this.houseUnit?.residents?.filter((r) => r.isActive) || [];
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
