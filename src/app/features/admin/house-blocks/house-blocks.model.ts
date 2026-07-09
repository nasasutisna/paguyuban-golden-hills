/**
 * House Blocks Data Models
 * Based on Swagger API specification
 */

/**
 * Block Type enumeration
 */
export enum BlockType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  MIXED = 'MIXED'
}

/**
 * Block Type display labels
 */
export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  [BlockType.RESIDENTIAL]: 'Residensial',
  [BlockType.COMMERCIAL]: 'Komersial',
  [BlockType.MIXED]: 'Campuran'
};

/**
 * Block Type color mapping for badges
 */
export const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  [BlockType.RESIDENTIAL]: 'success',
  [BlockType.COMMERCIAL]: 'warning',
  [BlockType.MIXED]: 'tertiary'
};

/**
 * Main House Block data model
 */
export interface HouseBlock {
  id: string;
  blockCode: string;
  blockName: string;
  blockType: BlockType;
  address?: string;
  totalUnits: number;
  totalFloors?: number;
  constructionYear?: number;
  facilities?: string; // JSON string
  amenities?: string;
  isActive?: boolean;
  description?: string;
  coordinatorId?: string;
  coordinator?: ResidentReference;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // Nested relations
  units?: HouseUnit[];
}

/**
 * Resident Reference (included in house block data)
 */
export interface ResidentReference {
  id: string;
  residentCode: string;
  firstName: string;
  lastName: string;
}

/**
 * House Unit (nested)
 */
export interface HouseUnit {
  id: string;
  unitCode: string;
  unitNumber: string;
  landArea: number;
  buildingArea: number;
  unitType?: string;
  occupancyStatus?: string;
  isActive: boolean;
}

/**
 * Create House Block DTO
 */
export interface CreateHouseBlockDto {
  blockCode: string;
  blockName: string;
  blockType: BlockType;
  address?: string;
  totalUnits: number;
  totalFloors?: number;
  constructionYear?: number;
  facilities?: string;
  amenities?: string;
  isActive?: boolean;
  description?: string;
  coordinatorId?: string;
}

/**
 * Update House Block DTO (all fields optional)
 */
export interface UpdateHouseBlockDto {
  blockCode?: string;
  blockName?: string;
  blockType?: BlockType;
  address?: string;
  totalUnits?: number;
  totalFloors?: number;
  constructionYear?: number;
  facilities?: string;
  amenities?: string;
  isActive?: boolean;
  description?: string;
  coordinatorId?: string;
}

/**
 * Pagination response wrapper
 */
export interface HouseBlockListResponse {
  data: HouseBlock[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Occupancy Statistics
 */
export interface OccupancyStats {
  totalBlocks: number;
  activeBlocks: number;
  inactiveBlocks: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number; // percentage
  averageOccupancyPerBlock?: number;
}

/**
 * Query parameters for list API
 */
export interface HouseBlockQueryParams {
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
 * Facility interface (parsed from JSON string)
 */
export interface Facility {
  parking?: boolean;
  gym?: boolean;
  pool?: boolean;
  security?: boolean;
  garden?: boolean;
  [key: string]: boolean | undefined;
}
