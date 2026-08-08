import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  archiveOutline,
  alertCircleOutline,
  cloudDownloadOutline,
  cloudUploadOutline,
  closeCircle,
  documentAttachOutline,
  documentTextOutline,
  downloadOutline,
  fileTrayOutline,
  refreshOutline,
  saveOutline,
  serverOutline,
  swapVertical,
  trashOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { downloadBlob } from '@core/utils/download-blob';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { AlertModalService } from '@services/alert-modal.service';
import { BackupInfo } from './backup.model';
import { BackupService } from './backup.service';

/**
 * Backup & Restore page (/admin/settings/backup — admin only).
 *
 * Three sections: create a backup, restore from a file, and the list of stored
 * backups (download / delete). Restore and delete both confirm first.
 */
@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './backup.page.html',
  styleUrls: ['./backup.page.scss'],
})
export class BackupPage implements OnInit {
  private readonly router = inject(Router);
  private readonly backupService = inject(BackupService);
  private readonly loadingService = inject(LoadingService);
  private readonly toastService = inject(ToastService);
  private readonly alertModalService = inject(AlertModalService);

  // List state
  backups: BackupInfo[] = [];
  loading = true;
  error: string | null = null;

  // Backup form
  includeUploads = true;
  creating = false;

  // Restore form
  selectedFile: File | null = null;
  restoring = false;

  private readonly subscriptions: Subscription[] = [];

  constructor() {
    // Register the icons used by this page (ionicons are tree-shaken; the global
    // addIcons in app.component may not include all of these variants).
    addIcons({
      'archive-outline': archiveOutline,
      'alert-circle-outline': alertCircleOutline,
      'cloud-download-outline': cloudDownloadOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'close-circle': closeCircle,
      'document-attach-outline': documentAttachOutline,
      'document-text-outline': documentTextOutline,
      'download-outline': downloadOutline,
      'file-tray-outline': fileTrayOutline,
      'refresh-outline': refreshOutline,
      'save-outline': saveOutline,
      'server-outline': serverOutline,
      'swap-vertical': swapVertical,
      'trash-outline': trashOutline,
    });
  }

  ngOnInit(): void {
    this.loadBackups();
  }

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  loadBackups(): void {
    this.loading = true;
    this.error = null;
    this.subscriptions.push(
      this.backupService
        .list()
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (data) => {
            this.backups = data ?? [];
          },
          error: (err) => {
            console.error('Failed to load backups', err);
            this.error = 'Gagal memuat daftar backup.';
          },
        }),
    );
  }

  handleRefresh(event: { target: { complete: () => void } }): void {
    this.backupService.list().subscribe({
      next: (data) => {
        this.backups = data ?? [];
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  createBackup(): void {
    this.creating = true;
    this.loadingService.show({ message: 'Membuat backup, mohon tunggu...' });
    this.subscriptions.push(
      this.backupService
        .create(this.includeUploads)
        .pipe(finalize(() => {
          this.creating = false;
          this.loadingService.dismiss();
        }))
        .subscribe({
          next: (res) => {
            this.toastService.success(`Backup dibuat: ${res.filename}`);
            this.loadBackups();
          },
          error: (err) => {
            console.error('Backup create failed', err);
            this.toastService.error('Gagal membuat backup.');
          },
        }),
    );
  }

  // ---------------------------------------------------------------------------
  // Restore
  // ---------------------------------------------------------------------------

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.selectedFile = null;
      return;
    }
    const okExt = /\.(zip|sql|gz)$/i.test(file.name);
    if (!okExt) {
      this.toastService.error('Format file tidak didukung. Pakai .zip, .sql, atau .sql.gz.');
      this.clearFile();
      return;
    }
    this.selectedFile = file;
  }

  clearFile(): void {
    this.selectedFile = null;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
  }

  async confirmRestore(): Promise<void> {
    if (!this.selectedFile) return;

    const confirmed = await this.alertModalService.open({
      type: 'warning',
      title: 'Restore Database',
      message:
        'Operasi ini akan MENIMPA seluruh data & file uploads yang ada sekarang dengan isi backup. ' +
        'Snapshot otomatis akan dibuat sebelum restore agar bisa dikembalikan.',
      highlight: { label: 'File', value: this.selectedFile.name },
      rows: [
        { label: 'Ukuran', value: this.formatBytes(this.selectedFile.size) },
      ],
      dismissable: false,
      buttons: [
        { text: 'Batal', role: 'cancel', variant: 'outline', value: 'cancel' },
        { text: 'Restore', role: 'destructive', variant: 'solid', value: 'restore' },
      ],
    });

    if (confirmed !== 'restore') return;

    this.restoring = true;
    this.loadingService.show({ message: 'Merestore database, mohon tunggu...' });
    this.subscriptions.push(
      this.backupService
        .restore(this.selectedFile)
        .pipe(finalize(() => {
          this.restoring = false;
          this.loadingService.dismiss();
        }))
        .subscribe({
          next: (res) => {
            this.toastService.success(
              `Restore berhasil${res.snapshot ? ` (snapshot: ${res.snapshot})` : ''}.`,
            );
            this.clearFile();
            this.loadBackups();
          },
          error: (err) => {
            console.error('Restore failed', err);
            this.toastService.error('Gagal merestore dari file backup.');
          },
        }),
    );
  }

  // ---------------------------------------------------------------------------
  // Per-file actions
  // ---------------------------------------------------------------------------

  download(item: BackupInfo): void {
    this.loadingService.show({ message: 'Mengunduh backup...' });
    this.subscriptions.push(
      this.backupService
        .download(item.filename)
        .pipe(finalize(() => this.loadingService.dismiss()))
        .subscribe({
          next: (blob) => {
            downloadBlob(blob, item.filename);
            this.toastService.success('Backup berhasil diunduh.');
          },
          error: (err) => {
            console.error('Download failed', err);
            this.toastService.error('Gagal mengunduh backup.');
          },
        }),
    );
  }

  async confirmDelete(item: BackupInfo): Promise<void> {
    const confirmed = await this.alertModalService.open({
      type: 'warning',
      title: 'Hapus Backup',
      message: 'File backup ini akan dihapus permanen dan tidak dapat dikembalikan.',
      highlight: { label: 'File', value: item.filename },
      dismissable: true,
      buttons: [
        { text: 'Batal', role: 'cancel', variant: 'outline', value: 'cancel' },
        { text: 'Hapus', role: 'destructive', variant: 'solid', value: 'delete' },
      ],
    });

    if (confirmed !== 'delete') return;

    this.subscriptions.push(
      this.backupService.remove(item.filename).subscribe({
        next: () => {
          this.toastService.success('Backup dihapus.');
          this.loadBackups();
        },
        error: (err) => {
          console.error('Delete failed', err);
          this.toastService.error('Gagal menghapus backup.');
        },
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const idx = Math.min(i, units.length - 1);
    return `${(bytes / Math.pow(1024, idx)).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  kindLabel(item: BackupInfo): string {
    return item.kind === 'full' ? 'Lengkap' : 'DB saja';
  }

  navigateToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
