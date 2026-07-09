import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { HouseBlocksService } from '../house-blocks.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import {
  HouseBlock,
  BlockType,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_COLORS
} from '../house-blocks.model';

/**
 * House Block Detail Page
 * Displays detailed information about a single house block
 */
@Component({
  selector: 'app-house-block-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './house-block-detail.page.html',
  styleUrls: ['./house-block-detail.page.scss']
})
export class HouseBlockDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private houseBlocksService = inject(HouseBlocksService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  houseBlock: HouseBlock | null = null;
  loading = true;
  error: string | null = null;

  private subscriptions: Subscription[] = [];

  // Display labels
  readonly BLOCK_TYPE_LABELS = BLOCK_TYPE_LABELS;
  readonly BLOCK_TYPE_COLORS = BLOCK_TYPE_COLORS;

  ngOnInit(): void {
    this.loadHouseBlock();
  }

  /**
   * Load house block data
   */
  private loadHouseBlock(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID Blok tidak diberikan';
      this.loading = false;
      return;
    }

    this.loadingService.show({ message: 'Memuat detail blok...' });

    this.subscriptions.push(
      this.houseBlocksService.getById(id).subscribe({
        next: (block) => {
          this.loadingService.dismiss();
          if (block) {
            this.houseBlock = block;
            this.loading = false;
          } else {
            this.error = 'Blok tidak ditemukan';
            this.loading = false;
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.error = 'Gagal memuat detail blok';
          this.loading = false;
          console.error('Error loading house block:', error);
        }
      })
    );
  }

  /**
   * Navigate to edit page
   */
  navigateToEdit(): void {
    if (this.houseBlock) {
      this.router.navigate(['/admin/house-blocks', this.houseBlock.id, 'edit']);
    }
  }

  /**
   * Navigate back to list
   */
  navigateBack(): void {
    this.router.navigate(['/admin/house-blocks']);
  }

  /**
   * Toggle active status
   */
  async toggleActiveStatus(): Promise<void> {
    if (!this.houseBlock) return;

    const newStatus = !this.houseBlock.isActive;
    const statusText = newStatus ? 'diaktifkan' : 'dinonaktifkan';

    this.subscriptions.push(
      this.houseBlocksService.update(this.houseBlock.id, { isActive: newStatus }).subscribe({
        next: (updated) => {
          if (updated) {
            this.houseBlock = updated;
            this.toastService.success(`Blok berhasil ${statusText}`);
          }
        },
        error: (error) => {
          console.error('Error updating house block status:', error);
          this.toastService.error(`Gagal ${statusText.replace('di', 'mem')} blok`);
        }
      })
    );
  }

  /**
   * Show delete confirmation
   */
  async confirmDelete(): Promise<void> {
    if (!this.houseBlock) return;

    const alert = await this.alertController.create({
      header: 'Hapus Blok',
      message: `Apakah Anda yakin ingin menghapus "${this.houseBlock.blockName}"? Tindakan ini tidak dapat dibatalkan.`,
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
    if (!this.houseBlock) return;

    this.loadingService.show({ message: 'Menghapus blok...' });

    this.subscriptions.push(
      this.houseBlocksService.delete(this.houseBlock.id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('Blok berhasil dihapus');
          this.router.navigate(['/admin/house-blocks']);
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal menghapus blok');
          console.error('Delete house block error:', error);
        }
      })
    );
  }

  /**
   * Format date for display
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
    return `${area.toLocaleString()} m²`;
  }

  /**
   * Get status color
   */
  getStatusColor(): string {
    return this.houseBlock?.isActive ? 'success' : 'medium';
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    return this.houseBlock?.isActive ? 'Aktif' : 'Tidak Aktif';
  }

  /**
   * Get block type color
   */
  getBlockTypeColor(): string {
    return this.houseBlock?.blockType ? BLOCK_TYPE_COLORS[this.houseBlock.blockType] : 'medium';
  }

  /**
   * Get facilities as array
   */
  getFacilities(): string[] {
    if (!this.houseBlock?.facilities) return [];
    try {
      const parsed = JSON.parse(this.houseBlock.facilities);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Get amenities as array
   */
  getAmenities(): string[] {
    if (!this.houseBlock?.amenities) return [];
    try {
      const parsed = JSON.parse(this.houseBlock.amenities);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Get coordinator name from house block
   */
  getCoordinatorName(): string {
    if (!this.houseBlock?.coordinator) return '-';
    const { firstName, lastName } = this.houseBlock.coordinator;
    return `${firstName} ${lastName}`.trim();
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
