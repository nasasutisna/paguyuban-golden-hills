/**
 * Dashboard models.
 *
 * `DashboardOverview` mirrors the backend `GET /dashboard/overview` response.
 * The page maps this single payload into its card/chart/transaction views.
 */

/** Current IPL period summary (null when no active period exists for this month). */
export interface DashboardIplPeriod {
  id: string;
  periodCode: string;
  periodName: string;
  month: number;
  year: number;
  label: string;
}

/** IPL collection status for the running period. */
export interface DashboardIplStatus {
  period: DashboardIplPeriod | null;
  totalUnits: number;
  paidUnits: number;
  pendingUnits: number;
  unpaidUnits: number;
  totalAmount: number;
}

/** Per-Kas (IPL / Warga) income, expense, and balance for the current month. */
export interface DashboardFundFlow {
  income: number;
  expense: number;
  balance: number;
}

/** IPL delinquency summary (units with a trailing streak of ≥3 unpaid months). */
export interface DashboardDelinquent {
  count: number;
  asOfLabel: string | null;
}

/** House-unit occupancy breakdown. */
export interface DashboardOccupancy {
  totalUnits: number;
  fullyOccupied: number;
  occasionally: number;
  vacant: number;
  rented: number;
  bankBuyback: number;
}

/** Aggregated payload returned by the dashboard overview endpoint. */
export interface DashboardOverview {
  houseUnits: { total: number; active: number };
  ipl: DashboardIplStatus;
  iplFund: DashboardFundFlow;
  wargaFund: DashboardFundFlow;
  balances: { ipl: number; warga: number };
  /** Consolidated (both Kas) income vs expense per month — legacy. */
  monthlyChart: MonthlyChartData[];
  /** Per-Kas monthly series for the dashboard charts. */
  iplMonthlyChart: MonthlyChartData[];
  wargaMonthlyChart: MonthlyChartData[];
  delinquent: DashboardDelinquent;
  occupancy: DashboardOccupancy;
  recentTransactions: RecentTransaction[];
}

/** Recent transaction item (display-oriented). */
export interface RecentTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  description: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
}

/** Dashboard stat card configuration (built client-side from the overview). */
export interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  route?: string;
}

/** Monthly chart data point. */
export interface MonthlyChartData {
  month: string;
  income: number;
  expense: number;
}
