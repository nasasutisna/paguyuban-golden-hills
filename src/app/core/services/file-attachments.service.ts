import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import { FileAttachment } from '@models/file-attachment.model';

/**
 * File Attachments Service
 * Reusable uploader + fetcher for polymorphic FileAttachments.
 *
 * Primary use case: the two-step expense-request proof-photo flow —
 *   1. uploadFiles(photos, 'EXPENSE_REQUEST', 'proof')  -> returns attachments (ids)
 *   2. caller passes the returned ids as `fileIds` when creating the entity
 *
 * NOTE: this is the first uploader in the repo. Other features (ipl-payments,
 * resident-payments) still use inline multipart; this service is additive and
 * does not touch them.
 */
@Injectable({ providedIn: 'root' })
export class FileAttachmentsService {
  private apiService = inject(ApiService);

  /**
   * Upload one or more files via POST /file-attachments/upload/multiple.
   * Backend uses FilesInterceptor('files', 10). `entityId` is left unset so
   * the caller can claim ownership via the entity create (linkFiles).
   *
   * @param files       File[] to upload (max 10, enforced by backend)
   * @param entityType  polymorphic entity type (e.g. 'EXPENSE_REQUEST')
   * @param category    optional category (e.g. 'proof')
   * @returns           the created FileAttachment[] (use .id for linking)
   */
  uploadFiles(
    files: File[],
    entityType: string,
    category?: string
  ): Observable<FileAttachment[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file, file.name));
    formData.append('entityType', entityType);
    if (category) {
      formData.append('category', category);
    }

    return this.apiService.post<FileAttachment[]>('/file-attachments/upload/multiple', formData).pipe(
      map((response) => {
        const data = response?.data;
        return Array.isArray(data) ? data : [];
      }),
      catchError((error) => {
        console.error('Error uploading files:', error);
        throw error;
      })
    );
  }

  /**
   * Get all FileAttachments linked to an entity.
   * GET /file-attachments/entity/:entityType/:entityId
   */
  getByEntity(entityType: string, entityId: string): Observable<FileAttachment[]> {
    return this.apiService
      .get<FileAttachment[]>(`/file-attachments/entity/${entityType}/${entityId}`)
      .pipe(
        map((response) => {
          const data = response?.data;
          return Array.isArray(data) ? data : [];
        }),
        catchError((error) => {
          console.error('Error fetching files by entity:', error);
          return of([]);
        })
      );
  }

  /**
   * Build a directly-viewable URL for a file given its stored `filePath`
   * (e.g. `/uploads/abc.jpg`). Strips `/api/v1` from the API base URL the
   * same way ipl-payment-detail's getFileUrl does.
   */
  fileUrl(filePath: string): string {
    const base = this.apiService.getBaseUrl().replace('/api/v1', '');
    return `${base}${filePath}`;
  }
}
