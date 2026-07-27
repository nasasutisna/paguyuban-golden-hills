/**
 * WhatsApp Blast Model
 * Types for the WhatsApp blast feature (Baileys) — collecting overdue IPL.
 * Shapes mirror the backend `/api/v1/whatsapp-blast/*` responses.
 */

/** WhatsApp socket connection state. */
export type WhatsAppConnectionState = 'CLOSED' | 'CONNECTING' | 'QR' | 'OPEN';

/** GET /whatsapp-blast/status */
export interface WhatsAppStatus {
  state: WhatsAppConnectionState;
  connected: boolean;
  phoneNumber: string | null;
  hasQr: boolean;
  qrDataUrl: string | null;
}

/** One delinquent recipient + computed reminder message. */
export interface BlastRecipientPreview {
  unitId: string;
  unitNumber: string | null;
  blockCode: string | null;
  blockName: string | null;
  residentName: string | null;
  rawPhone: string | null;
  normalizedPhone: string | null;
  phoneValid: boolean;
  phoneError: string | null;
  outstandingMonths: number;
  monthRange: string;
  outstandingAmount: number;
  messagePreview: string;
}

/** GET /whatsapp-blast/delinquents */
export interface DelinquentPreview {
  year: number;
  asOfMonth: number;
  asOfLabel: string | null;
  houseBlockId: string | null;
  count: number;
  withPhone: number;
  withoutPhone: number;
  recipients: BlastRecipientPreview[];
}

/** POST /whatsapp-blast/blast body */
export interface TriggerBlastDto {
  year?: number;
  houseBlockId?: string;
  dryRun?: boolean;
  note?: string;
}

/** POST /whatsapp-blast/blast result */
export interface BlastResult {
  batchId: string;
  batchNo: string;
  dryRun: boolean;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
}

/** POST /whatsapp-blast/send-test body */
export interface SendTestDto {
  phoneNumber: string;
  message?: string;
}

/** POST /whatsapp-blast/send-test result */
export interface SendTestResult {
  to: string;
  messageId: string;
  message: string;
}

export type BlastBatchStatus =
  | 'DRAFT'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface BlastTriggeredBy {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export type BlastRecipientStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

/** Per-recipient result inside a batch detail. */
export interface BlastRecipient {
  id: string;
  blastId: string;
  unitId: string | null;
  residentName: string | null;
  unitNumber: string | null;
  blockCode: string | null;
  blockName: string | null;
  rawPhone: string | null;
  normalizedPhone: string | null;
  status: BlastRecipientStatus;
  errorMessage: string | null;
  outstandingMonths: number | null;
  outstandingAmount: number | null;
  sentAt: string | null;
  createdAt: string;
}

/** GET /whatsapp-blast/batches item (header). */
export interface BlastBatch {
  id: string;
  batchNo: string;
  year: number;
  asOfMonth: number;
  houseBlockId: string | null;
  status: BlastBatchStatus;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  dryRun: boolean;
  messageTemplate: string;
  triggeredById: string;
  triggeredBy?: BlastTriggeredBy;
  startedAt: string | null;
  completedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present in batch detail response. */
  recipients?: BlastRecipient[];
}

/** Paginated list response for batches (reshaped from ApiResponse.meta). */
export interface BlastBatchListResponse {
  data: BlastBatch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Query params for GET /whatsapp-blast/batches */
export interface BlastBatchQueryParams {
  page?: number;
  limit?: number;
  status?: BlastBatchStatus;
  year?: number;
  houseBlockId?: string;
  dryRun?: 'true' | 'false';
}

/**
 * Status badges for the batch history table.
 * Icons restricted to ones already registered globally in app.component.ts.
 */
export const BATCH_STATUS_BADGES = [
  { value: 'DRAFT', label: 'Draft', color: 'medium', icon: 'document-text-outline' },
  { value: 'RUNNING', label: 'Berjalan', color: 'warning', icon: 'hourglass' },
  { value: 'COMPLETED', label: 'Selesai', color: 'success', icon: 'checkmark-circle' },
  { value: 'FAILED', label: 'Gagal', color: 'danger', icon: 'close-circle' },
  { value: 'CANCELLED', label: 'Dibatalkan', color: 'medium', icon: 'remove-circle-outline' },
];

/** Status badges for per-recipient rows in batch detail. */
export const RECIPIENT_STATUS_BADGES = [
  { value: 'PENDING', label: 'Menunggu', color: 'warning', icon: 'time-outline' },
  { value: 'SENT', label: 'Terkirim', color: 'success', icon: 'checkmark-circle' },
  { value: 'FAILED', label: 'Gagal', color: 'danger', icon: 'close-circle' },
  { value: 'SKIPPED', label: 'Dilewati', color: 'medium', icon: 'remove-circle-outline' },
];
