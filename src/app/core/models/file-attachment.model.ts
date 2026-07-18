/**
 * File Attachment Model
 * Shared shape for polymorphic file attachments (proof photos, receipts, etc.).
 * Mirrors backend `FileAttachment` Prisma model (file_attachments table).
 *
 * entityType values used across features (polymorphic discriminator):
 *  - 'EXPENSE_REQUEST'  -> proof photos for an ExpenseRequest
 *  - 'ResidentPayment'  -> proof files for a ResidentPayment
 *  - 'IplPayment'       -> proof files for an IplPayment
 */

/** Polymorphic entity type used when storing expense-request proof photos. */
export const EXPENSE_REQUEST_ENTITY_TYPE = 'EXPENSE_REQUEST';

export interface FileAttachment {
  id: string;
  entityType: string;
  entityId?: string | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  category?: string | null;
  description?: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}
