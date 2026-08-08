import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import {
  BackupInfo,
  CreateBackupResult,
  RestoreResult,
} from './backup.model';

/**
 * Backup & Restore API client.
 *
 * Endpoints (all `/backup`, admin-only):
 *  - GET    /backup                        → list backups
 *  - POST   /backup?includeUploads=true    → create backup
 *  - GET    /backup/:filename/download     → binary stream
 *  - POST   /backup/restore (multipart)    → restore from file
 *  - DELETE /backup/:filename              → delete backup
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly apiService = inject(ApiService);
  private readonly basePath = '/backup';

  /** List stored backup files, newest first. */
  list(): Observable<BackupInfo[]> {
    return this.apiService
      .get<BackupInfo[]>(this.basePath)
      .pipe(map((res) => res.data ?? []));
  }

  /** Create a backup archive. Default includes the uploads folder. */
  create(includeUploads = true): Observable<CreateBackupResult> {
    const query = `?includeUploads=${includeUploads ? 'true' : 'false'}`;
    return this.apiService
      .post<CreateBackupResult>(`${this.basePath}${query}`, {})
      .pipe(map((res) => res.data));
  }

  /** Download a backup file as a Blob (auth handled by the JWT interceptor). */
  download(filename: string): Observable<Blob> {
    const safe = encodeURIComponent(filename);
    return this.apiService.getBlob(`${this.basePath}/${safe}/download`);
  }

  /** Restore from an uploaded backup file (.zip / .sql / .sql.gz). Destructive. */
  restore(file: File): Observable<RestoreResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.apiService
      .post<RestoreResult>(`${this.basePath}/restore`, formData)
      .pipe(map((res) => res.data));
  }

  /** Delete a stored backup file. */
  remove(filename: string): Observable<void> {
    const safe = encodeURIComponent(filename);
    return this.apiService
      .delete<void>(`${this.basePath}/${safe}`)
      .pipe(map(() => undefined));
  }
}
