/**
 * Storage key constants
 * Used for storing and retrieving data from Capacitor Preferences
 */

export const STORAGE_KEYS = {
  // Authentication
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data',
  REMEMBER_ME: 'auth_remember_me',
  REMEMBERED_USERNAME: 'auth_remembered_username'
} as const;
