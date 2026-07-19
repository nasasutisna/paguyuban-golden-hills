/**
 * IPL Payment Matrix Models
 *
 * Read-only matrix that shows, per house unit, the monthly IPL payment
 * status for a whole year (Jan..Dec). The matrix is composed on the
 * client from existing endpoints (house units + IPL periods + payments
 * per period) — there is no dedicated backend endpoint.
 *
 * A cell is "paid" when an `IplPayment(unitId, periodId)` exists with
 * status APPROVED. PENDING shows as "Proses" and is excluded from totals.
 */

/**
 * Status of a single month cell in the matrix.
 * Derived from `IplPayment.status` for the (unit, period) pair.
 */
export type MonthCellStatus = 'PAID' | 'PENDING' | 'UNPAID';

/** Display labels (Indonesian) for each cell status. */
export const MONTH_CELL_STATUS_LABELS: Record<MonthCellStatus, string> = {
  PAID: 'Lunas',
  PENDING: 'Proses',
  UNPAID: 'Belum'
};

/**
 * CSS class appended to a `.cell-badge` / `.month-chip` to color it.
 * These names must match the `&.paid` / `&.pending` / `&.unpaid` rules in
 * ipl-payment-matrix.page.scss.
 */
export const MONTH_CELL_STATUS_COLORS: Record<MonthCellStatus, string> = {
  PAID: 'paid',
  PENDING: 'pending',
  UNPAID: 'unpaid'
};

/** Glyph shown inside a compact month cell. */
export const MONTH_CELL_STATUS_ICONS: Record<MonthCellStatus, string> = {
  PAID: 'checkmark-circle',
  PENDING: 'time',
  UNPAID: 'remove'
};

/**
 * One month cell: the (computed) status for a given unit in a given month,
 * plus the paid amount (only meaningful when status is PAID).
 */
export interface MatrixMonthCell {
  /** Calendar month 1..12. */
  month: number;
  /** Short Indonesian month name (Jan, Feb, ...). */
  monthName: string;
  /** Backing IPL period id, if a period exists for this month. */
  periodId?: string;
  /**
   * Backing IPL payment id when a payment exists for the (unit, period) pair
   * (i.e. status is PAID or PENDING). Used to deep-link into payment detail.
   */
  paymentId?: string;
  /** Derived payment status. */
  status: MonthCellStatus;
  /** Paid amount when status is PAID, else undefined. */
  amount?: number;
}

/**
 * One matrix row = one house unit, with its identity, monthly rate, the
 * 12 month cells, and a couple of precomputed counters.
 */
export interface PaymentMatrixRow {
  /** 1-based display number (row index). */
  no: number;
  unitId: string;
  unitCode: string;
  unitNumber: string;
  blockCode?: string;
  blockName?: string;
  landArea?: number;
  buildingArea?: number;
  /** Primary resident name (first resident of the unit), if any. */
  residentName?: string;
  /** Id of the primary resident, used to deep-link into resident detail. */
  residentId?: string;
  phoneNumber?: string;
  /** Effective IPL percentage for the unit (0..100). */
  iplPercentage?: number;
  /** Short obligation label e.g. "FULL", "SETENGAH (50%)", "0%". */
  obligationLabel?: string;
  notes?: string;
  /** Computed monthly rate = period.baseRate × iplPercentage/100. */
  monthlyRate?: number;
  /** Whether the unit is active. */
  isActive: boolean;
  /** 12 cells, index 0 = January. */
  cells: MatrixMonthCell[];
  /** Count of PAID cells. */
  paidCount: number;
  /** Count of PENDING cells. */
  pendingCount: number;
}

/**
 * Full matrix payload returned by the service and rendered by the page.
 */
export interface PaymentMatrixData {
  year: number;
  rows: PaymentMatrixRow[];
  /** Per-month total of APPROVED amounts, index 0 = January. */
  monthTotals: number[];
  /** Sum of every month total. */
  grandTotal: number;
  /** Number of unit rows. */
  unitCount: number;
  /** Total PAID cells across the whole matrix. */
  paidCellCount: number;
}

/**
 * Minimal house-block descriptor for the block filter dropdown.
 * `null` houseBlockId means "all blocks" (no filter).
 */
export interface HouseBlockOption {
  id: string;
  blockCode: string;
  blockName: string;
}

/** Short Indonesian month names, index 0 = January. */
export const MONTH_NAMES_SHORT: string[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/** Long Indonesian month names, index 0 = January. */
export const MONTH_NAMES_LONG: string[] = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/** Build an empty matrix payload (used as fallback on error / no data). */
export function emptyMatrixData(year: number): PaymentMatrixData {
  return {
    year,
    rows: [],
    monthTotals: Array.from({ length: 12 }, () => 0),
    grandTotal: 0,
    unitCount: 0,
    paidCellCount: 0
  };
}
