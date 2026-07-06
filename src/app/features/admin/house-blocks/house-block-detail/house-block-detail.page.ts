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
      this.error = 'House Block ID not provided';
      this.loading = false;
      return;
    }

    this.loadingService.show({ message: 'Loading block details...' });

    this.subscriptions.push(
      this.houseBlocksService.getById(id).subscribe({
        next: (block) => {
          this.loadingService.dismiss();
          if (block) {
            this.houseBlock = block;
            this.loading = false;
          } else {
            this.error = 'House Block not found';
            this.loading = false;
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.error = 'Failed to load house block details';
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
    const statusText = newStatus ? 'activate' : 'deactivate';

    this.subscriptions.push(
      this.houseBlocksService.update(this.houseBlock.id, { isActive: newStatus }).subscribe({
        next: (updated) => {
          if (updated) {
            this.houseBlock = updated;
            this.toastService.success(`House block ${statusText}d successfully`);
          }
        },
        error: (error) => {
          console.error('Error updating house block status:', error);
          this.toastService.error(`Failed to ${statusText} house block`);
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
      header: 'Delete House Block',
      message: `Are you sure you want to delete "${this.houseBlock.blockName}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
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

    this.loadingService.show({ message: 'Deleting house block...' });

    this.subscriptions.push(
      this.houseBlocksService.delete(this.houseBlock.id).subscribe({
        next: () => {
          this.loadingService.dismiss();
          this.toastService.success('House block deleted successfully');
          this.router.navigate(['/admin/house-blocks']);
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Failed to delete house block');
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
    return new Date(date).toLocaleDateString('en-US', {
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
    return this.houseBlock?.isActive ? 'Active' : 'Inactive';
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
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
