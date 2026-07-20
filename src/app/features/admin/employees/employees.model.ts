/**
 * Employees Data Models
 * Based on Swagger API specification (backend: employees module)
 */

/**
 * Employment Status enumeration
 */
export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  PROBATION = 'PROBATION',
  RESIGNED = 'RESIGNED',
  TERMINATED = 'TERMINATED'
}

/**
 * Gender enumeration
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

/**
 * Marital Status enumeration
 */
export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED'
}

/**
 * Employment Status display labels
 */
export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  [EmploymentStatus.ACTIVE]: 'Aktif',
  [EmploymentStatus.PROBATION]: 'Masa Percobaan',
  [EmploymentStatus.RESIGNED]: 'Resign',
  [EmploymentStatus.TERMINATED]: 'Diberhentikan'
};

/**
 * Gender display labels
 */
export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: 'Laki-laki',
  [Gender.FEMALE]: 'Perempuan',
  [Gender.OTHER]: 'Lainnya'
};

/**
 * Marital Status display labels
 */
export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  [MaritalStatus.SINGLE]: 'Belum Menikah',
  [MaritalStatus.MARRIED]: 'Menikah',
  [MaritalStatus.DIVORCED]: 'Cerai',
  [MaritalStatus.WIDOWED]: 'Janda/Duda'
};

/**
 * Employment Status color mapping for badges
 */
export const EMPLOYMENT_STATUS_COLORS: Record<EmploymentStatus, string> = {
  [EmploymentStatus.ACTIVE]: 'success',
  [EmploymentStatus.PROBATION]: 'warning',
  [EmploymentStatus.RESIGNED]: 'medium',
  [EmploymentStatus.TERMINATED]: 'danger'
};

/**
 * Gender color mapping for badges
 */
export const GENDER_COLORS: Record<Gender, string> = {
  [Gender.MALE]: 'primary',
  [Gender.FEMALE]: 'secondary',
  [Gender.OTHER]: 'tertiary'
};

/**
 * Position reference (included in employee data)
 */
export interface EmployeePositionReference {
  id: string;
  positionCode: string;
  positionName: string;
  department?: string;
  level?: number;
}

/**
 * Role reference (included in employee data)
 */
export interface EmployeeRoleReference {
  id: string;
  name: string;
  description?: string;
}

/**
 * User reference (linked account, included in employee data)
 */
export interface EmployeeUserReference {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Main Employee data model
 */
export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  identityNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  positionId: string;
  position?: EmployeePositionReference;
  roleId?: string;
  role?: EmployeeRoleReference;
  userId?: string;
  user?: EmployeeUserReference;
  hireDate?: string;
  probationEndDate?: string;
  employmentStatus: EmploymentStatus;
  terminationDate?: string;
  basicSalary?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  taxId?: string;
  photo?: string;
  isActive?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Create Employee DTO
 */
export interface CreateEmployeeDto {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  identityNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  positionId: string;
  hireDate: string;
  probationEndDate?: string;
  employmentStatus: EmploymentStatus;
  basicSalary?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  taxId?: string;
  photo?: string;
  isActive?: boolean;
  notes?: string;
}

/**
 * Update Employee DTO (all fields optional)
 */
export interface UpdateEmployeeDto {
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  identityNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  positionId?: string;
  hireDate?: string;
  probationEndDate?: string;
  employmentStatus?: EmploymentStatus;
  basicSalary?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  taxId?: string;
  photo?: string;
  isActive?: boolean;
  notes?: string;
}

/**
 * Pagination response wrapper
 */
export interface EmployeeListResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query parameters for list API
 */
export interface EmployeeQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string;
  filters?: string; // JSON string
  fields?: string;
}

/**
 * Employee Statistics
 */
export interface EmployeeStatistics {
  totalEmployees: number;
  activeEmployees: number;
  probationEmployees: number;
  resignedEmployees: number;
  terminatedEmployees: number;
  byDepartment: Record<string, number>;
}
