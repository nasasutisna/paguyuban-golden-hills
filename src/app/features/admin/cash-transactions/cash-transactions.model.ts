/**
 * Cash Transactions Model
 * Defines interfaces, enums, and DTOs for cash transaction management
 */

// Import reference types from shared constants
import {
  REFERENCE_TYPES,
  REFERENCE_TYPE_LABELS,
  INCOME_REFERENCE_TYPES,
  EXPENSE_REFERENCE_TYPES,
  isIncomeReferenceType,
  isExpenseReferenceType,
  getReferenceTypeOptions
} from '@core/constants/reference-types';
import type { ReferenceType } from '@core/constants/reference-types';

// Re-export for convenience
export {
  REFERENCE_TYPES,
  REFERENCE_TYPE_LABELS,
  INCOME_REFERENCE_TYPES,
  EXPENSE_REFERENCE_TYPES,
  isIncomeReferenceType,
  isExpenseReferenceType,
  getReferenceTypeOptions
};

// Export the type
export type { ReferenceType };

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
 * Fund Type Enum — which Kas (cash account) a transaction belongs to.
 */
export enum FundType {
  IPL = 'IPL',
  WARGA = 'WARGA'
}

/**
 * Fund Type Labels
 */
export const FUND_TYPE_LABELS: Record<FundType, string> = {
  [FundType.IPL]: 'Kas IPL',
  [FundType.WARGA]: 'Kas Warga'
};

/**
 * Cash account codes (mirrors backend CASH_ACCOUNT_CODES).
 */
export const CASH_ACCOUNT_CODES = {
  KAS_IPL: 'KAS_IPL',
  KAS_WARGA: 'KAS_WARGA'
} as const;
export type CashAccountCode = typeof CASH_ACCOUNT_CODES[keyof typeof CASH_ACCOUNT_CODES];

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
  /** Fund this category posts to (IPL | WARGA). Drives which Kas is used. */
  fundType?: FundType | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cash Account (Kas) Interface
 */
export interface CashAccount {
  id: string;
  accountCode: string;
  accountName: string;
  fundType: FundType | string;
  openingBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Per-account balance (from GET /cash-accounts/balances)
 */
export interface AccountBalance {
  id: string;
  accountCode: string;
  accountName: string;
  fundType: FundType | string;
  openingBalance: number;
  /** All-time balance: openingBalance + Σincome − Σexpense (transfers included). */
  balance: number;
  periodIncome: number;
  periodExpense: number;
  periodBalance: number;
  isActive: boolean;
}

/**
 * Cash Transaction Interface
 */
export interface CashTransaction {
  id: string;
  transactionNumber?: string;  // Transaction number from API
  transactionDate: string;
  transactionType: TransactionType;
  category: TransactionCategory;
  categoryId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceType?: ReferenceType;
  referenceId?: string;
  referenceNumber?: string;
  /** Cash account (Kas) this transaction posts to. */
  cashAccountId?: string;
  cashAccount?: {
    id: string;
    accountCode: string;
    accountName: string;
    fundType: FundType | string;
  };
  /** True for the paired legs of an inter-account transfer. */
  isInternalTransfer?: boolean;
  transferGroupId?: string;
  description: string;
  notes?: string;
  // API returns 'status', mapped to 'approvalStatus' in service
  approvalStatus: ApprovalStatus;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  // Optional nested objects from API
  creator?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  approver?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
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
  referenceType?: ReferenceType;
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
  referenceType?: ReferenceType;
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
  cashAccountId?: string;
  paymentMethod?: PaymentMethod;
  approvalStatus?: ApprovalStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Transfer money between two cash accounts (Kas).
 */
export interface CreateTransferDto {
  fromAccountCode: CashAccountCode;
  toAccountCode: CashAccountCode;
  amount: number;
  transactionDate: string;
  description?: string;
}

/**
 * Transfer response from POST /cash-transactions/transfer
 */
export interface TransferResult {
  transferGroupId: string;
  legs: CashTransaction[];
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
 * Matches server response from /api/v1/cash-transactions/summary
 */
export interface TransactionSummary {
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  pendingApproval: number;
}

/**
 * Category Breakdown for Reports
 */
export interface CategoryBreakdown {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
}

/**
 * IPL/KEGIATAN Report Statistics
 */
export interface ReportStatistics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  breakdownByCategory: CategoryBreakdown[];
  period?: {
    startDate: string;
    endDate: string;
  };
}
