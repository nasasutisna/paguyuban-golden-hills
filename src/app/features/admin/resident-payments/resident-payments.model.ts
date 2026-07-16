/**
 * Resident Payments Data Models
 * Based on Swagger API specification
 */

/**
 * Payment Method enumeration
 */
export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  E_WALLET = 'E_WALLET'
}

/**
 * Payment Status enumeration
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Payment Method display labels
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Tunai',
  [PaymentMethod.TRANSFER]: 'Transfer',
  [PaymentMethod.CARD]: 'Kartu',
  [PaymentMethod.E_WALLET]: 'E-Wallet'
};

/**
 * Payment Status display labels
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'Menunggu',
  [PaymentStatus.COMPLETED]: 'Selesai',
  [PaymentStatus.FAILED]: 'Gagal',
  [PaymentStatus.CANCELLED]: 'Dibatalkan'
};

/**
 * Payment Method color mapping for badges
 */
export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'success',
  [PaymentMethod.TRANSFER]: 'primary',
  [PaymentMethod.CARD]: 'tertiary',
  [PaymentMethod.E_WALLET]: 'warning'
};

/**
 * Payment Status color mapping for badges
 */
export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'warning',
  [PaymentStatus.COMPLETED]: 'success',
  [PaymentStatus.FAILED]: 'danger',
  [PaymentStatus.CANCELLED]: 'medium'
};

/**
 * File attachment (bukti transfer / kwitansi) linked polymorphically to a payment.
 * Fetched via /file-attachments/entity/ResidentPayment/:id (not embedded in payment).
 */
export interface FileAttachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  category?: string | null;
  createdAt?: string;
}

/**
 * Receipt (kwitansi) info returned by /resident-payments/:id/receipt
 */
export interface ReceiptInfo {
  id: string;
  fileName: string;
  filePath: string;
  url: string;
  fileSize: number;
  mimeType: string;
  category: string;
  paymentNumber: string;
  paymentId: string;
}

/**
 * Resident reference (included in payment data)
 */
export interface ResidentReference {
  id: string;
  residentCode: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  houseBlock?: {
    id: string;
    blockCode: string;
    blockName: string;
  };
  unitNumber: string;
}

/**
 * Invoice reference (included in payment data)
 */
export interface InvoiceReference {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  remainingAmount: number;
  status: string;
}

/**
 * Main Resident Payment data model
 */
export interface ResidentPayment {
  id: string;
  paymentNumber: string;
  residentId: string;
  resident?: ResidentReference;
  invoiceId?: string | null;
  invoice?: InvoiceReference;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentChannel?: string;
  referenceNumber?: string;
  amount: number;
  bankName?: string;
  accountNumber?: string;
  status: PaymentStatus;
  notes?: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  files?: FileAttachment[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Create Resident Payment DTO
 * invoiceId is optional (payment may be recorded without a tagihan).
 * proofFile (bukti transfer) is required for TRANSFER/E_WALLET/CARD, optional for CASH.
 */
export interface CreateResidentPaymentDto {
  residentId: string;
  invoiceId?: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentChannel?: string;
  referenceNumber?: string;
  amount: number;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
  proofFile?: File;
}

/**
 * Update Resident Payment DTO (all fields optional)
 */
export interface UpdateResidentPaymentDto {
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  paymentChannel?: string;
  referenceNumber?: string;
  amount?: number;
  bankName?: string;
  accountNumber?: string;
  status?: PaymentStatus;
  notes?: string;
}

/**
 * Pagination response wrapper
 */
export interface ResidentPaymentListResponse {
  data: ResidentPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query parameters for list API
 */
export interface ResidentPaymentQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string;
  filters?: string;
  fields?: string;
}

/**
 * Payment Statistics
 */
export interface PaymentStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  cancelled: number;
  totalAmount: number;
  todayAmount: number;
  thisMonthAmount: number;
}

/**
 * Bulk Payment Item DTO
 */
export interface BulkPaymentItemDto {
  residentId: string;
  invoiceId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentChannel?: string;
  referenceNumber?: string;
  amount: number;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
}

/**
 * Create Bulk Payment DTO
 */
export interface CreateBulkResidentPaymentDto {
  payments: BulkPaymentItemDto[];
  batchNotes?: string;
}

/**
 * Bulk Payment Result
 */
export interface BulkPaymentResult {
  successful: ResidentPayment[];
  failed: Array<{
    payment: BulkPaymentItemDto;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}
