/**
 * Reference Type Constants for Cash Transactions
 * Mirror of backend reference types for consistency
 */

/**
 * Reference type enum
 * Defines the types of entities that can be linked to cash transactions
 */
export const REFERENCE_TYPES = {
  // Income sources - Pemasukan
  IPL_PAYMENT: 'IPL_PAYMENT',
  KEGIATAN_PAYMENT: 'KEGIATAN_PAYMENT',
  COMMUNITY_INCOME: 'COMMUNITY_INCOME',
  RESIDENT_PAYMENT: 'RESIDENT_PAYMENT',

  // Expense types - Pengeluaran
  IPL_EXPENSE: 'IPL_EXPENSE',
  KEGIATAN_EXPENSE: 'KEGIATAN_EXPENSE',
  OPERATIONAL: 'OPERATIONAL',
  SALARY: 'SALARY',
  EMPLOYEE_CASH_ADVANCE: 'EMPLOYEE_CASH_ADVANCE',
  // System-generated: set by backend when a CashTransaction is auto-posted
  // from an approved ExpenseRequest (referenceId = ExpenseRequest.id).
  EXPENSE_REQUEST: 'EXPENSE_REQUEST',
} as const;

/**
 * Reference type type
 */
export type ReferenceType = typeof REFERENCE_TYPES[keyof typeof REFERENCE_TYPES];

/**
 * Reference type labels for UI display
 */
export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  [REFERENCE_TYPES.IPL_PAYMENT]: 'Pembayaran IPL',
  [REFERENCE_TYPES.KEGIATAN_PAYMENT]: 'Iuran Kegiatan Warga',
  [REFERENCE_TYPES.COMMUNITY_INCOME]: 'Pemasukan Komunitas',
  [REFERENCE_TYPES.RESIDENT_PAYMENT]: 'Pembayaran Warga',

  [REFERENCE_TYPES.IPL_EXPENSE]: 'Pengeluaran IPL',
  [REFERENCE_TYPES.KEGIATAN_EXPENSE]: 'Pengeluaran Kegiatan',
  [REFERENCE_TYPES.OPERATIONAL]: 'Operasional',
  [REFERENCE_TYPES.SALARY]: 'Gaji Karyawan',
  [REFERENCE_TYPES.EMPLOYEE_CASH_ADVANCE]: 'Uang Muka Karyawan',
  [REFERENCE_TYPES.EXPENSE_REQUEST]: 'Pengajuan Pengeluaran',
};

/**
 * Reference type options grouped by transaction type
 * For dropdown filtering based on selected transactionType
 */
export const INCOME_REFERENCE_TYPES: ReferenceType[] = [
  REFERENCE_TYPES.IPL_PAYMENT,
  REFERENCE_TYPES.KEGIATAN_PAYMENT,
  REFERENCE_TYPES.COMMUNITY_INCOME,
  REFERENCE_TYPES.RESIDENT_PAYMENT,
];

export const EXPENSE_REFERENCE_TYPES: ReferenceType[] = [
  REFERENCE_TYPES.IPL_EXPENSE,
  REFERENCE_TYPES.KEGIATAN_EXPENSE,
  REFERENCE_TYPES.OPERATIONAL,
  REFERENCE_TYPES.SALARY,
  REFERENCE_TYPES.EMPLOYEE_CASH_ADVANCE,
  REFERENCE_TYPES.EXPENSE_REQUEST,
];

/**
 * Check if a reference type is for income
 */
export function isIncomeReferenceType(type: ReferenceType): boolean {
  return INCOME_REFERENCE_TYPES.includes(type);
}

/**
 * Check if a reference type is for expense
 */
export function isExpenseReferenceType(type: ReferenceType): boolean {
  return EXPENSE_REFERENCE_TYPES.includes(type);
}

/**
 * Get reference type options based on transaction type
 */
export function getReferenceTypeOptions(transactionType: 'INCOME' | 'EXPENSE' | 'ALL' = 'ALL'): Array<{ value: ReferenceType; label: string }> {
  const types = transactionType === 'INCOME'
    ? INCOME_REFERENCE_TYPES
    : transactionType === 'EXPENSE'
    ? EXPENSE_REFERENCE_TYPES
    : [...INCOME_REFERENCE_TYPES, ...EXPENSE_REFERENCE_TYPES];

  return types.map(type => ({
    value: type,
    label: REFERENCE_TYPE_LABELS[type]
  }));
}
