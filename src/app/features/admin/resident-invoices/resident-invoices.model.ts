/**
 * Resident Invoices Data Models
 * Based on Swagger API specification
 */

/**
 * Invoice Status enumeration
 */
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

/**
 * Invoice Status display labels
 */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: 'Draft',
  [InvoiceStatus.PENDING]: 'Menunggu Pembayaran',
  [InvoiceStatus.PAID]: 'Lunas',
  [InvoiceStatus.PARTIAL]: 'Sebagian',
  [InvoiceStatus.OVERDUE]: 'Terlambat',
  [InvoiceStatus.CANCELLED]: 'Dibatalkan'
};

/**
 * Invoice Status color mapping for badges
 */
export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: 'medium',
  [InvoiceStatus.PENDING]: 'warning',
  [InvoiceStatus.PAID]: 'success',
  [InvoiceStatus.PARTIAL]: 'tertiary',
  [InvoiceStatus.OVERDUE]: 'danger',
  [InvoiceStatus.CANCELLED]: 'dark'
};

/**
 * Resident reference (included in invoice data)
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
 * Fee Type reference (included in invoice data)
 */
export interface FeeTypeReference {
  id: string;
  feeCode: string;
  feeName: string;
  feeCategory: string;
  defaultAmount?: number;
}

/**
 * Main Resident Invoice data model
 */
export interface ResidentInvoice {
  id: string;
  invoiceNumber: string;
  residentId: string;
  resident?: ResidentReference;
  feeTypeId: string;
  feeType?: FeeTypeReference;
  invoiceDate: string;
  dueDate: string;
  periodStartDate: string;
  periodEndDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Create Resident Invoice DTO
 */
export interface CreateResidentInvoiceDto {
  residentId: string;
  feeTypeId: string;
  invoiceDate: string;
  dueDate: string;
  periodStartDate: string;
  periodEndDate: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
  createdBy?: string;
}

/**
 * Update Resident Invoice DTO (all fields optional)
 */
export interface UpdateResidentInvoiceDto {
  residentId?: string;
  feeTypeId?: string;
  invoiceDate?: string;
  dueDate?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
}

/**
 * Pagination response wrapper
 */
export interface ResidentInvoiceListResponse {
  data: ResidentInvoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query parameters for list API
 */
export interface ResidentInvoiceQueryParams {
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
 * Invoice Statistics
 */
export interface InvoiceStats {
  total: number;
  draft: number;
  pending: number;
  paid: number;
  partial: number;
  overdue: number;
  cancelled: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}
