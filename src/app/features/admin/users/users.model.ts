/**
 * Users Management Models
 */

export type PasswordMode = 'manual' | 'generate';

/** Role reference embedded in user responses */
export interface UserRoleReference {
  id: string;
  name: string;
  description?: string;
}

/** Resident reference embedded in user responses (the linked warga) */
export interface UserResidentReference {
  id: string;
  residentCode: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  houseBlock?: {
    id: string;
    blockCode: string;
    blockName: string;
  } | null;
}

/** Main User model */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  isEmailVerified?: boolean;
  roleId: string;
  role?: UserRoleReference;
  resident?: UserResidentReference | null;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Role model (from /roles) */
export interface Role {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

/** Create user payload */
export interface CreateUserDto {
  username: string;
  email: string;
  password?: string;
  passwordMode?: PasswordMode;
  sendViaWhatsapp?: boolean;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roleId: string;
  residentId?: string;
  isActive?: boolean;
}

/** Update user payload (username/email/password not editable here) */
export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roleId?: string;
  residentId?: string | null;
  isActive?: boolean;
}

/** Reset password payload */
export interface ResetPasswordDto {
  password?: string;
  passwordMode?: PasswordMode;
  sendViaWhatsapp?: boolean;
}

/** Result of create / reset-password (carries the generated password + WA status) */
export interface PasswordDeliveryResult {
  generatedPassword?: string;
  whatsappSent?: boolean;
  whatsappError?: string;
}

export type UserWithCredentials = User & PasswordDeliveryResult;

/** Paginated list response */
export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RoleListResponse {
  data: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Query parameters for list API */
export interface UserQueryParams {
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
 * Role color mapping for badges. Falls back to 'medium'.
 */
export const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'danger',
  ADMIN: 'primary',
  ACCOUNTANT: 'success',
  MANAGER: 'secondary',
  STAFF: 'tertiary',
  PENGURUS: 'warning',
  COORDINATOR: 'medium',
};
