/**
 * Authentication models and interfaces
 * Based on Swagger API specification
 */

/**
 * Login request DTO
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Register request DTO
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roleId?: string;
}

/**
 * Refresh token request DTO
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Token response data
 */
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

/**
 * Role information
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
}

/**
 * User information
 */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
  role?: Role;
}

/**
 * Login response data from API
 * The API returns { data: { accessToken, refreshToken, expiresIn, tokenType, user } }
 */
export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: User;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  errors?: string[][];
  timestamp: string;
  path: string;
}

/**
 * Stored authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Role enum for authorization
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator'
}
