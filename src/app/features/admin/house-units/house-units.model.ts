/**
 * House Units Data Models
 * Based on Swagger API specification
 */

/**
 * Occupancy Status enumeration
 */
export enum OccupancyStatus {
  FULLY_OCCUPIED = 'FULLY_OCCUPIED',
  OCCASIONALLY = 'OCCASIONALLY',
  VACANT = 'VACANT',
  RENTED = 'RENTED'
}

/**
 * Occupancy Status display labels (Indonesian)
 */
export const OCCUPANCY_STATUS_LABELS: Record<OccupancyStatus, string> = {
  [OccupancyStatus.FULLY_OCCUPIED]: 'Ditinggali Penuh',
  [OccupancyStatus.OCCASIONALLY]: 'Jarang Ditinggali',
  [OccupancyStatus.VACANT]: 'Kosong',
  [OccupancyStatus.RENTED]: 'Disewakan'
};

/**
 * Occupancy Status color mapping for badges
 */
export const OCCUPANCY_STATUS_COLORS: Record<OccupancyStatus, string> = {
  [OccupancyStatus.FULLY_OCCUPIED]: 'success',
  [OccupancyStatus.OCCASIONALLY]: 'warning',
  [OccupancyStatus.VACANT]: 'danger',
  [OccupancyStatus.RENTED]: 'tertiary'
};

/**
 * Occupancy Status IPL Percentage
 */
export const OCCUPANCY_IPL_PERCENTAGE: Record<OccupancyStatus, number> = {
  [OccupancyStatus.FULLY_OCCUPIED]: 100,
  [OccupancyStatus.OCCASIONALLY]: 50,
  [OccupancyStatus.VACANT]: 0,
  [OccupancyStatus.RENTED]: 100
};

/**
 * Main House Unit data model
 */
export interface HouseUnit {
  id: string;
  unitCode: string;
  unitNumber: string;
  houseBlockId: string;
  landArea: number;
  buildingArea: number;
  floorNumber?: number;
  unitType?: string;
  occupancyStatus: OccupancyStatus;
  occupancyNotes?: string;
  isBankBuyback: boolean;
  buybackDate?: string;
  iplPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // Nested relations
  houseBlock?: HouseBlock;
  residents?: Resident[];
}

/**
 * House Block (nested)
 */
export interface HouseBlock {
  id: string;
  blockCode: string;
  blockName: string;
  blockType?: string;
  address?: string;
}

/**
 * Resident (nested)
 */
export interface Resident {
  id: string;
  residentCode: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  ownershipType?: string;
  isActive: boolean;
  moveInDate?: string;
  moveOutDate?: string;
}

/**
 * Create House Unit DTO
 */
export interface CreateHouseUnitDto {
  unitCode: string;
  unitNumber: string;
  houseBlockId: string;
  landArea: number;
  buildingArea: number;
  floorNumber?: number;
  unitType?: string;
  occupancyStatus?: OccupancyStatus;
  occupancyNotes?: string;
  isBankBuyback?: boolean;
  buybackDate?: string;
  iplPercentage?: number;
  isActive?: boolean;
}

/**
 * Update House Unit DTO (all fields optional)
 */
export interface UpdateHouseUnitDto {
  unitCode?: string;
  unitNumber?: string;
  houseBlockId?: string;
  landArea?: number;
  buildingArea?: number;
  floorNumber?: number;
  unitType?: string;
  occupancyStatus?: OccupancyStatus;
  occupancyNotes?: string;
  isBankBuyback?: boolean;
  buybackDate?: string;
  iplPercentage?: number;
  isActive?: boolean;
}

/**
 * Pagination response wrapper
 */
export interface HouseUnitListResponse {
  data: HouseUnit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Occupancy Statistics
 */
export interface HouseUnitOccupancyStats {
  totalUnits: number;
  fullyOccupied: number;
  occasionally: number;
  vacant: number;
  rented: number;
  bankBuyback: number;
}

/**
 * Query parameters for list API
 */
export interface HouseUnitQueryParams {
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
 * Unit Type options
 */
export const UNIT_TYPE_OPTIONS = [
  { value: 'Tipe 21', label: 'Tipe 21' },
  { value: 'Tipe 36', label: 'Tipe 36' },
  { value: 'Tipe 45', label: 'Tipe 45' },
  { value: 'Tipe 54', label: 'Tipe 54' },
  { value: 'Tipe 60', label: 'Tipe 60' },
  { value: 'Tipe 70', label: 'Tipe 70' },
  { value: 'Tipe 120', label: 'Tipe 120' },
  { value: 'Commercial', label: 'Commercial/Ruko' },
  { value: 'Office', label: 'Kantor' },
  { value: 'Other', label: 'Lainnya' }
];
