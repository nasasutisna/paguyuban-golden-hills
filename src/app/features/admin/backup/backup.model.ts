/**
 * Backup & Restore — frontend models (mirror backend BackupService responses).
 */

export type BackupKind = 'full' | 'db';

export interface BackupInfo {
  /** Filename within the backups/ directory. */
  filename: string;
  /** Size in bytes. */
  size: number;
  /** ISO timestamp from file mtime. */
  createdAt: string;
  /** full = .zip (db + maybe uploads), db = standalone .sql/.sql.gz */
  kind: BackupKind;
}

export interface CreateBackupResult {
  filename: string;
  size: number;
  createdAt: string;
  uploadsIncluded: boolean;
}

export interface RestoreResult {
  snapshot: string | null;
  restoredDb: boolean;
  restoredUploads: boolean;
  durationMs: number;
}
