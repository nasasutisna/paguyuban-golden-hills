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
 * Forgot password (WhatsApp OTP) — step 1 request.
 */
export interface ForgotPasswordRequest {
  unitNumber: string;
  phoneNumber: string;
}

/**
 * Forgot password — step 1 response data.
 * `resetToken` ties step 1 to step 2; `maskedPhone` is the UI hint.
 */
export interface ForgotPasswordResponseData {
  resetToken: string;
  maskedPhone: string;
}

/**
 * Forgot password (WhatsApp OTP) — step 2 reset.
 */
export interface ResetPasswordRequest {
  resetToken: string;
  otp: string;
  newPassword: string;
}

/**
 * Register (WhatsApp OTP) — step 1 request.
 * User proves ownership of the unit via the WhatsApp number registered to it.
 */
export interface RegisterOtpRequest {
  unitNumber: string;
  phoneNumber: string;
}

/**
 * Register — step 1 response data.
 * `registerToken` ties step 1 to step 2; `maskedPhone` is the UI hint.
 */
export interface RegisterOtpResponseData {
  registerToken: string;
  maskedPhone: string;
}

/**
 * Register (WhatsApp OTP) — step 2 complete.
 * Backend verifies the OTP, creates the account (identity auto-derived from the
 * resident) and returns auth tokens for auto-login.
 */
export interface RegisterCompleteRequest {
  registerToken: string;
  otp: string;
  newPassword: string;
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
