/**
 * Residents Data Models
 * Based on Swagger API specification
 */

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
 * Ownership Type enumeration
 */
export enum OwnershipType {
  OWNER = 'OWNER',
  RENTER = 'RENTER'
}

/**
 * Gender display labels
 */
export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: 'Male',
  [Gender.FEMALE]: 'Female',
  [Gender.OTHER]: 'Other'
};

/**
 * Marital Status display labels
 */
export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  [MaritalStatus.SINGLE]: 'Single',
  [MaritalStatus.MARRIED]: 'Married',
  [MaritalStatus.DIVORCED]: 'Divorced',
  [MaritalStatus.WIDOWED]: 'Widowed'
};

/**
 * Ownership Type display labels
 */
export const OWNERSHIP_TYPE_LABELS: Record<OwnershipType, string> = {
  [OwnershipType.OWNER]: 'Owner',
  [OwnershipType.RENTER]: 'Renter'
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
 * Ownership Type color mapping for badges
 */
export const OWNERSHIP_TYPE_COLORS: Record<OwnershipType, string> = {
  [OwnershipType.OWNER]: 'success',
  [OwnershipType.RENTER]: 'warning'
};

/**
 * Main Resident data model
 */
export interface Resident {
  id: string;
  residentCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  identityNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  occupation?: string;
  maritalStatus?: MaritalStatus;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  houseBlockId: string;
  houseBlock?: HouseBlockReference;
  unitNumber: string;
  moveInDate?: string;
  moveOutDate?: string;
  ownershipType: OwnershipType;
  isActive?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * House Block reference (included in resident data)
 */
export interface HouseBlockReference {
  id: string;
  blockCode: string;
  blockName: string;
  blockType: string;
}

/**
 * Create Resident DTO
 */
export interface CreateResidentDto {
  residentCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  identityNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  occupation?: string;
  maritalStatus?: MaritalStatus;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  houseBlockId: string;
  unitNumber: string;
  moveInDate?: string;
  moveOutDate?: string;
  ownershipType: OwnershipType;
  isActive?: boolean;
  notes?: string;
}

/**
 * Update Resident DTO (all fields optional)
 */
export interface UpdateResidentDto {
  residentCode?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  identityNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  occupation?: string;
  maritalStatus?: MaritalStatus;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  houseBlockId?: string;
  unitNumber?: string;
  moveInDate?: string;
  moveOutDate?: string;
  ownershipType?: OwnershipType;
  isActive?: boolean;
  notes?: string;
}

/**
 * Pagination response wrapper
 */
export interface ResidentListResponse {
  data: Resident[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query parameters for list API
 */
export interface ResidentQueryParams {
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
 * Resident Statistics
 */
export interface ResidentStats {
  total: number;
  active: number;
  inactive: number;
  ownership: {
    owners: number;
    renters: number;
  };
  gender: {
    male: number;
    female: number;
    other: number;
  };
  maritalStatus: {
    single: number;
    married: number;
    divorced: number;
    widowed: number;
  };
}
