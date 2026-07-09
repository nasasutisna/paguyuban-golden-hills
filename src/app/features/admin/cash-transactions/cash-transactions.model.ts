/**
 * Cash Transactions Model
 * Defines interfaces, enums, and DTOs for cash transaction management
 */

/**
 * Transaction Type Enum
 */
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

/**
 * Transaction Type Labels
 */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'Pemasukan',
  [TransactionType.EXPENSE]: 'Pengeluaran'
};

/**
 * Payment Method Enum
 */
export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD'
}

/**
 * Payment Method Labels
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Tunai',
  [PaymentMethod.TRANSFER]: 'Transfer',
  [PaymentMethod.CARD]: 'Kartu Kredit/Debit'
};

/**
 * Approval Status Enum
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

/**
 * Approval Status Labels
 */
export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: 'Menunggu Persetujuan',
  [ApprovalStatus.APPROVED]: 'Disetujui',
  [ApprovalStatus.REJECTED]: 'Ditolak'
};

/**
 * Transaction Category Interface
 */
export interface TransactionCategory {
  id: string;
  categoryCode: string;
  categoryName: string;
  description?: string;
  categoryType: TransactionType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cash Transaction Interface
 */
export interface CashTransaction {
  id: string;
  transactionDate: string;
  transactionType: TransactionType;
  category: TransactionCategory;
  categoryId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  description: string;
  notes?: string;
  approvalStatus: ApprovalStatus;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create Cash Transaction DTO
 */
export interface CreateCashTransactionDto {
  transactionDate: string;
  transactionType: TransactionType;
  categoryId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  description: string;
  notes?: string;
  requiresApproval?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Update Cash Transaction DTO
 */
export interface UpdateCashTransactionDto {
  transactionDate?: string;
  transactionType?: TransactionType;
  categoryId?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  description?: string;
  notes?: string;
  requiresApproval?: boolean;
}

/**
 * Cash Transaction Query Params
 */
export interface CashTransactionQueryParams {
  page?: number;
  limit?: number;
  transactionType?: TransactionType;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  approvalStatus?: ApprovalStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Paginated Cash Transactions Response
 */
export interface CashTransactionsResponse {
  data: CashTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Transaction Summary
 */
export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingApproval: number;
  transactionCount: number;
}
