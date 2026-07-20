/**
 * Employee Salary Headers (Penggajian) — model.
 *
 * Penggajian sederhana: satu angka gaji bersih per karyawan per periode.
 * Saat dibuat, backend menandai header PAID dan langsung memposting
 * CashTransaction EXPENSE kategori GAJI ke Kas IPL.
 */

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  CALCULATED = 'CALCULATED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  [PayrollStatus.DRAFT]: 'Draft',
  [PayrollStatus.CALCULATED]: 'Dihitung',
  [PayrollStatus.APPROVED]: 'Disetujui',
  [PayrollStatus.PAID]: 'Dibayar',
  [PayrollStatus.CANCELLED]: 'Dibatalkan',
};

export const PAYROLL_STATUS_COLORS: Record<PayrollStatus, string> = {
  [PayrollStatus.DRAFT]: 'medium',
  [PayrollStatus.CALCULATED]: 'warning',
  [PayrollStatus.APPROVED]: 'primary',
  [PayrollStatus.PAID]: 'success',
  [PayrollStatus.CANCELLED]: 'danger',
};

export interface EmployeeSalaryHeaderEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName?: string | null;
  position?: { id: string; positionName: string } | null;
}

/** The Kas IPL expense linked to a paid payroll (referenceType=SALARY). */
export interface LinkedCashTransaction {
  id: string;
  transactionNumber: string;
  transactionDate?: string | null;
  transactionType?: string;
  amount?: number;
  status?: string;
  description?: string;
  category?: { id: string; categoryCode: string; categoryName: string; fundType?: string | null } | null;
  cashAccount?: { id: string; accountCode: string; accountName: string } | null;
}

export interface EmployeeSalaryHeader {
  id: string;
  payrollNumber: string;
  employeeId: string;
  payPeriod: string;
  paymentDate?: string | null;
  basicSalary?: number;
  totalAllowances?: number;
  totalDeductions?: number;
  netSalary?: number;
  status: PayrollStatus;
  locked: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeSalaryHeaderEmployee | null;
  // Convenience fields populated by the service for table display.
  employeeName?: string;
  positionName?: string;
  // Cash transaction created alongside (only present on create response).
  cashTransaction?: any;
  cashTransactionId?: string;
}

export interface CreateSimplePayrollDto {
  employeeId: string;
  payPeriod: string;
  netSalary: number;
  paymentDate?: string;
  notes?: string;
}

export interface EmployeeSalaryHeadersQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: PayrollStatus;
  employeeId?: string;
  payPeriod?: string;
  search?: string;
}

export interface EmployeeSalaryHeadersResponse {
  data: EmployeeSalaryHeader[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
