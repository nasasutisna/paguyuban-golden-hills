import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Storage service for managing local data persistence
 * Wraps @capacitor/preferences for easier key-value operations
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  /**
   * Get a value from storage by key
   * @param key - Storage key
   * @param defaultValue - Default value if key doesn't exist
   */
  async get<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key });
      if (value === null) {
        return defaultValue ?? null;
      }
      // Try to parse as JSON, fallback to raw value
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      console.error(`Error getting value for key "${key}":`, error);
      return defaultValue ?? null;
    }
  }

  /**
   * Set a value in storage
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified if object)
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await Preferences.set({ key, value: stringValue });
    } catch (error) {
      console.error(`Error setting value for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Remove a value from storage
   * @param key - Storage key to remove
   */
  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error(`Error removing value for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear all values from storage
   */
  async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Get all keys from storage
   */
  async keys(): Promise<string[]> {
    try {
      const { keys } = await Preferences.keys();
      return keys;
    } catch (error) {
      console.error('Error getting keys:', error);
      return [];
    }
  }

  /**
   * Check if a key exists in storage
   * @param key - Storage key to check
   */
  async has(key: string): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key });
      return value !== null;
    } catch {
      return false;
    }
  }
}
