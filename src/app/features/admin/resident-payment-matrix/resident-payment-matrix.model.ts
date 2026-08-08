/**
 * Resident Payment (Iuran Warga) Matrix Models
 *
 * Read-only coverage matrix that shows, per house unit, which months of the
 * selected year (Jan..Des) are covered by Iuran Warga payments. Built by the
 * backend `GET /resident-payments/matrix?year=` endpoint.
 *
 * Iuran is a FLAT monthly rate (`monthlyRate`, Rp20.000) — the same for every
 * unit, unlike IPL which varies by land area. A unit's total COMPLETED
 * payments for the year are divided by the rate to get the number of covered
 * months; those months are filled sequentially from January
 * (oldest-unpaid-first), exactly like the IPL matrix marks months PAID. So
 * paying a multiple of the rate (e.g. 3 × 20.000) covers that many months in
 * a row, and any later payment ("bayar lagi") rolls into the next month.
 *
 * A cell is "paid" when its month index is within the unit's covered months.
 * PENDING (not-yet-verified) payments do not count toward coverage; they
 * surface as a row-level `pendingCount` badge instead.
 */

/**
 * Status of a single month cell in the matrix.
 * Derived from the aggregated ResidentPayment statuses for the (unit, month).
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
 * resident-payment-matrix.page.scss.
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
  /**
   * Backing resident payment id when a payment exists for the (unit, month)
   * pair (i.e. status is PAID or PENDING). Used to deep-link into payment
   * detail.
   */
  paymentId?: string;
  /** Derived payment status. */
  status: MonthCellStatus;
  /** Paid amount when status is PAID, else undefined. */
  amount?: number;
}

/**
 * One matrix row = one house unit, with its identity, the 12 month cells, and
 * a couple of precomputed counters.
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
  /** Whether the unit is active. */
  isActive: boolean;
  /** Flat monthly Iuran Warga rate (IDR), e.g. 20000. */
  monthlyRate?: number;
  /** Total COMPLETED amount the unit paid this year (actual cash, IDR). */
  totalPaid?: number;
  /** Full months covered = floor(totalPaid / monthlyRate). May exceed 12. */
  coveredMonths?: number;
  /** 12 cells, index 0 = January. */
  cells: MatrixMonthCell[];
  /** Count of PAID cells (covered months, capped at 12). */
  paidCount: number;
  /** Number of PENDING (unverified) payments for the unit — row-level only. */
  pendingCount: number;
}

/**
 * Full matrix payload returned by the service and rendered by the page.
 */
export interface PaymentMatrixData {
  year: number;
  /** Flat monthly Iuran Warga rate (IDR) used to compute coverage. */
  monthlyRate?: number;
  rows: PaymentMatrixRow[];
  /** Per-month total of COMPLETED amounts, index 0 = January. */
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
