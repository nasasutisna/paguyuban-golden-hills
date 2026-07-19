/**
 * IPL Payments Model
 * Models, interfaces, and enums for IPL (Iuran Pemeliharaan Lingkungan) payment management
 */

/**
 * IPL Payment Status
 */
export enum IplPaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

/**
 * Status display labels
 */
export const IPL_PAYMENT_STATUS_LABELS: Record<IplPaymentStatus, string> = {
  [IplPaymentStatus.PENDING]: 'Menunggu',
  [IplPaymentStatus.APPROVED]: 'Disetujui',
  [IplPaymentStatus.REJECTED]: 'Ditolak'
};

/**
 * Status color mappings for Ionic chips
 */
export const IPL_PAYMENT_STATUS_COLORS: Record<IplPaymentStatus, string> = {
  [IplPaymentStatus.PENDING]: 'warning',
  [IplPaymentStatus.APPROVED]: 'success',
  [IplPaymentStatus.REJECTED]: 'danger'
};

/**
 * IPL Period Status
 */
export enum IplPeriodStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED'
};

/**
 * IPL Period Status labels
 */
export const IPL_PERIOD_STATUS_LABELS: Record<IplPeriodStatus, string> = {
  [IplPeriodStatus.DRAFT]: 'Draft',
  [IplPeriodStatus.ACTIVE]: 'Aktif',
  [IplPeriodStatus.CLOSED]: 'Tutup'
};

/**
 * Payment Method
 */
export enum IplPaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  E_WALLET = 'E_WALLET',
  CARD = 'CARD'
}

/**
 * Payment Method labels
 */
export const IPL_PAYMENT_METHOD_LABELS: Record<IplPaymentMethod, string> = {
  [IplPaymentMethod.CASH]: 'Tunai',
  [IplPaymentMethod.TRANSFER]: 'Transfer',
  [IplPaymentMethod.E_WALLET]: 'E-Wallet',
  [IplPaymentMethod.CARD]: 'Kartu'
};

/**
 * IPL Period interface
 */
export interface IplPeriod {
  id: string;
  periodCode: string;
  periodName: string;
  month: number;
  year: number;
  baseRate: number;
  status: IplPeriodStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * IPL Payment interface
 */
export interface IplPayment {
  id: string;
  paymentNumber: string;
  periodId: string;
  residentId: string;
  houseUnitId: string;
  paymentDate: string;

  // Calculated amount details
  landArea: number;
  iplPercentage: number;
  baseRate: number;
  calculatedAmount: number;

  // Payment details
  paymentMethod: IplPaymentMethod;
  referenceNumber?: string;
  notes?: string;

  // Approval flow
  status: IplPaymentStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;

  submittedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  // Payment group reference (links multi-month payments together)
  paymentGroupId?: string | null;

  // Relations
  period?: IplPeriod;
  resident?: IplPaymentResident;
  houseUnit?: IplPaymentHouseUnit;
  submitter?: IplPaymentUser;
  approver?: IplPaymentUser;
  files?: FileAttachment[];
  approvalHistories?: ApprovalHistory[];

  // Meta info for payments (including multi-month and kegiatan)
  _meta?: PaymentMeta;

  // Kegiatan payment info (if any)
  kegiatanPayment?: KegiatanPaymentInfo;
}

/**
 * Payment Meta interface
 * Contains additional information about the payment including multi-month and kegiatan details
 */
export interface PaymentMeta {
  isMultiMonth?: boolean;
  monthCount?: number;
  totalIplAmount?: number;
  totalKegiatanAmount?: number;
  grandTotal?: number;
  allPaymentIds?: string[];
}

/**
 * Kegiatan Payment Info interface
 * Information about iuran kegiatan warga payment linked to this IPL payment
 */
export interface KegiatanPaymentInfo {
  id: string;
  paymentNumber: string;
  amount: number;
  invoiceId?: string;
  referenceNumber?: string;
}

/**
 * Resident relation in IPL Payment
 */
export interface IplPaymentResident {
  id: string;
  firstName: string;
  lastName: string;
  unitNumber: string;
  phoneNumber?: string;
  landArea: number;
  iplPercentage: number;
  houseBlock?: {
    id: string;
    blockName: string;
  };
  houseUnit?: {
    id: string;
    unitNumber: string;
    landArea: number;
    iplPercentage: number;
  };
}

/**
 * House Unit relation in IPL Payment
 */
export interface IplPaymentHouseUnit {
  id: string;
  unitNumber: string;
  landArea: number;
  iplPercentage: number;
  houseBlock?: {
    id: string;
    blockName: string;
  };
}

/**
 * User relation in IPL Payment
 */
export interface IplPaymentUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

/**
 * File Attachment
 */
export interface FileAttachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  category?: string;
  createdAt: string;
}

/**
 * Approval History
 */
export interface ApprovalHistory {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  status: string;
  fromStatus?: string;
  toStatus?: string;
  approvedBy: string;
  comments?: string;
  createdAt: string;
  approver?: IplPaymentUser;
}

/**
 * Create IPL Payment DTO
 */
export interface CreateIplPaymentDto {
  periodId: string;
  residentId: string;
  monthCount?: number;
  paymentDate: string;
  paymentMethod: IplPaymentMethod;
  kegiatanAmount?: number;        // NEW: Iuran kegiatan warga (optional)
  notes?: string;
  proofFile?: File;
  // referenceNumber is now auto-generated by backend
}

/**
 * Update IPL Payment DTO
 */
export interface UpdateIplPaymentDto {
  paymentDate?: string;
  paymentMethod?: IplPaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

/**
 * Approve IPL Payment DTO
 */
export interface ApproveIplPaymentDto {
  comments?: string;
}

/**
 * Reject IPL Payment DTO
 */
export interface RejectIplPaymentDto {
  rejectionReason: string;
}

/**
 * Create IPL Period DTO
 */
export interface CreateIplPeriodDto {
  periodCode: string;
  periodName: string;
  month: number;
  year: number;
  baseRate?: number;
  status?: IplPeriodStatus;
  dueDate?: string;
}

/**
 * Update IPL Period DTO
 */
export interface UpdateIplPeriodDto {
  periodCode?: string;
  periodName?: string;
  month?: number;
  year?: number;
  baseRate?: number;
  status?: IplPeriodStatus;
  dueDate?: string;
}

/**
 * Generate IPL Periods (full year) DTO
 * Body for POST /ipl-periods/generate
 */
export interface GenerateIplPeriodsDto {
  year: number;
  baseRate?: number;
  status?: IplPeriodStatus;
  /** Day of month (1-31) used to derive a per-month dueDate. */
  dueDay?: number;
}

/**
 * Result of a full-year generate request.
 */
export interface GenerateIplPeriodsResult {
  created: number;
  skipped: number;
  skippedMonths: number[];
  periods: IplPeriod[];
}

/**
 * Query parameters for IPL Payments list
 */
export interface IplPaymentQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string;
  filters?: string;
  fields?: string;
  status?: IplPaymentStatus;
  periodId?: string;
  residentId?: string;
  houseBlockId?: string;
  submittedBy?: string;
}

/**
 * Query parameters for IPL Periods list
 */
export interface IplPeriodQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string;
  filters?: string;
  fields?: string;
  status?: IplPeriodStatus;
  year?: number;
  month?: number;
}

/**
 * Paginated list response for IPL Payments
 */
export interface IplPaymentListResponse {
  data: IplPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated list response for IPL Periods
 */
export interface IplPeriodListResponse {
  data: IplPeriod[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated list response for IPL Periods with payment statistics
 */
export interface IplPeriodWithStatsListResponse {
  data: IplPeriodWithStats[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * IPL Payment Statistics
 */
export interface IplPaymentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  currentMonth?: number;
  currentYear?: number;
}

/**
 * Receipt Info interface
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
 * IPL Period with payment count
 */
export interface IplPeriodWithStats extends IplPeriod {
  paymentCount?: number;
  totalAmount?: number;
  approvedAmount?: number;
  pendingAmount?: number;
}

/**
 * Payments by Reference Number Response
 * Response structure for GET /ipl-payments/by-reference/:referenceNumber
 */
export interface PaymentsByReferenceResponse {
  referenceNumber: string;
  buktiTransfer?: BuktiTransferFile;
  iplPayments: IplPaymentSummary[];
  kegiatanPayments: KegiatanPaymentSummary[];
  summary: PaymentSummary;
}

/**
 * Bukti Transfer File interface
 */
export interface BuktiTransferFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

/**
 * IPL Payment Summary for by-reference response
 */
export interface IplPaymentSummary {
  id: string;
  paymentNumber: string;
  period: string;
  amount: number;
  status: string;
  paymentDate: string;
}

/**
 * Kegiatan Payment Summary for by-reference response
 */
export interface KegiatanPaymentSummary {
  id: string;
  paymentNumber: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
}

/**
 * Payment Summary for by-reference response
 */
export interface PaymentSummary {
  totalIpl: number;
  totalKegiatan: number;
  grandTotal: number;
  paymentCount: number;
}

