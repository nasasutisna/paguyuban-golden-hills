/**
 * Expense Requests Model
 * Frontend models + DTOs + enums for the "Request Pengeluaran" feature.
 * Mirrors backend module src/expense-requests/ (NestJS).
 *
 * Pattern follows ipl-payments.model.ts: enum + LABELS + COLORS triplets,
 * one main entity interface, sub-interfaces for relations, and DTOs.
 */
import { FileAttachment } from '@models/file-attachment.model';

// Re-export so feature pages can import everything from here.
export { FileAttachment } from '@models/file-attachment.model';
export { EXPENSE_REQUEST_ENTITY_TYPE } from '@models/file-attachment.model';

// ------------------------------------------------------------------
// Enums + display maps
// ------------------------------------------------------------------

export enum ExpenseRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export const EXPENSE_REQUEST_STATUS_LABELS: Record<ExpenseRequestStatus, string> = {
  [ExpenseRequestStatus.PENDING]: 'Menunggu',
  [ExpenseRequestStatus.APPROVED]: 'Disetujui',
  [ExpenseRequestStatus.REJECTED]: 'Ditolak',
  [ExpenseRequestStatus.CANCELLED]: 'Dibatalkan',
};

export const EXPENSE_REQUEST_STATUS_COLORS: Record<ExpenseRequestStatus, string> = {
  [ExpenseRequestStatus.PENDING]: 'warning',
  [ExpenseRequestStatus.APPROVED]: 'success',
  [ExpenseRequestStatus.REJECTED]: 'danger',
  [ExpenseRequestStatus.CANCELLED]: 'medium',
};

/** Payment method (optional on create). Matches backend enum hint. */
export enum ExpensePaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
}

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  [ExpensePaymentMethod.CASH]: 'Tunai',
  [ExpensePaymentMethod.TRANSFER]: 'Transfer',
  [ExpensePaymentMethod.CARD]: 'Kartu',
};

// ------------------------------------------------------------------
// Sub-interfaces (relations returned by backend)
// ------------------------------------------------------------------

export interface ExpenseRequestUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: { id: string; name: string };
}

export interface ExpenseRequestResident {
  id: string;
  residentCode?: string;
  firstName?: string;
  lastName?: string;
}

export interface ExpenseRequestCategory {
  id: string;
  categoryCode: string;
  categoryName: string;
  categoryType: string;
}

export interface ApprovalHistory {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  status: string;
  fromStatus?: string;
  toStatus?: string;
  approvedBy?: string;
  createdBy?: string;
  comments?: string;
  createdAt: string;
  approver?: { id: string; username?: string; firstName?: string; lastName?: string };
}

// ------------------------------------------------------------------
// Main entity
// ------------------------------------------------------------------

/**
 * `amount` is a Prisma Decimal on the backend and may arrive as a string
 * (e.g. "250000.00"). Always coerce with Number() before formatting.
 */
export interface ExpenseRequest {
  id: string;
  requestNumber: string;
  title: string;
  description?: string | null;
  amount: number | string;
  categoryId?: string | null;
  requestedById: string;
  residentId?: string | null;
  transactionDate: string;
  paymentMethod?: string | null;
  status: ExpenseRequestStatus;

  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;

  /** FK to the auto-posted CashTransaction (set on approval). */
  cashTransactionId?: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  // Relations
  requester?: ExpenseRequestUser;
  approver?: ExpenseRequestUser;
  resident?: ExpenseRequestResident | null;
  category?: ExpenseRequestCategory | null;
  files?: FileAttachment[];
  approvalHistories?: ApprovalHistory[];
}

// ------------------------------------------------------------------
// DTOs
// ------------------------------------------------------------------

export interface CreateExpenseRequestDto {
  title: string;
  description?: string;
  amount: number;
  categoryId?: string;
  transactionDate: string; // YYYY-MM-DD
  paymentMethod?: ExpensePaymentMethod | string;
  residentId?: string;
  /** Proof-photo ids returned by POST /file-attachments/upload/multiple. */
  fileIds?: string[];
}

export interface ApproveExpenseRequestDto {
  comments?: string;
}

export interface RejectExpenseRequestDto {
  reason: string;
  comments?: string;
}

// ------------------------------------------------------------------
// Query + paginated response
// ------------------------------------------------------------------

export interface ExpenseRequestQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: ExpenseRequestStatus | string;
  categoryId?: string;
  requestedById?: string;
  residentId?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
}

export interface ExpenseRequestListResponse {
  data: ExpenseRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
