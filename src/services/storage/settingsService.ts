/**
 * Settings Service
 * In API mode: Database is the SINGLE source of truth
 * localStorage is only used as a cache, populated by syncFromApi on startup
 */

import { isApiMode, settingsApi } from '../api';
import type { StudioSettings } from '../../types';
import { STORAGE_KEYS, DEFAULT_STUDIO_SETTINGS } from '../../constants';
import { setWaitingCursor } from './helpers';

export const settingsService = {
  // Get settings - reads from localStorage cache (populated from DB on startup)
  get: (): StudioSettings | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // BLOCKING PRODUCTION BUG FIX: Settings MUST be saved to database
  // This method now returns a Promise and WAITS for API response
  // The SettingsPage MUST use saveAsync() instead for proper error handling
  save: (settings: StudioSettings): void => {
    // In localStorage mode, just save locally
    if (!isApiMode()) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return;
    }

    // In API mode: Save to BOTH database AND localStorage cache
    // Note: This is fire-and-forget - use saveAsync() for proper error handling
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const apiKey = import.meta.env.VITE_API_KEY || '';

    setWaitingCursor(true);

    fetch(`${baseUrl}/settings?action=save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(settings),
    })
      .then(response => {
        if (!response.ok) {
          console.error('[Settings] API save failed:', response.status);
          throw new Error('Failed to save settings to database');
        }
        console.log('[Settings] Successfully saved to database');
      })
      .catch(error => {
        console.error('[Settings] Save error:', error);
      })
      .finally(() => {
        setWaitingCursor(false);
      });
  },

  // ASYNC SAVE - Use this in SettingsPage for proper error handling
  // This WAITS for the database save and throws on failure
  saveAsync: async (settings: StudioSettings): Promise<void> => {
    console.log('[Settings] saveAsync called, isApiMode:', isApiMode());

    if (!isApiMode()) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return;
    }

    // Use the settingsApi from api.ts for consistency
    setWaitingCursor(true);

    try {
      console.log('[Settings] Calling settingsApi.save()...');
      const result = await settingsApi.save(settings);
      console.log('[Settings] API response:', result);

      // Update localStorage cache after successful DB save
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      console.log('[Settings] Successfully saved to database and updated cache');
    } catch (error) {
      console.error('[Settings] API save failed:', error);
      throw error;
    } finally {
      setWaitingCursor(false);
    }
  },

  getOrDefault: (): StudioSettings => {
    const existing = settingsService.get();
    if (existing) return existing;

    // In API mode, don't auto-save defaults - they should come from DB
    if (isApiMode()) {
      return DEFAULT_STUDIO_SETTINGS;
    }

    settingsService.save(DEFAULT_STUDIO_SETTINGS);
    return DEFAULT_STUDIO_SETTINGS;
  },

  // ASYNC version that properly handles API mode
  updatePartialAsync: async (updates: Partial<StudioSettings>): Promise<StudioSettings> => {
    const current = settingsService.getOrDefault();
    const updated = { ...current, ...updates };
    await settingsService.saveAsync(updated);
    return updated;
  },

  // Legacy sync version - use updatePartialAsync in SettingsPage instead
  updatePartial: (updates: Partial<StudioSettings>): StudioSettings => {
    const current = settingsService.getOrDefault();
    const updated = { ...current, ...updates };
    settingsService.save(updated);
    return updated;
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    get: async (): Promise<StudioSettings | null> => {
      if (isApiMode()) {
        return settingsApi.get() as Promise<StudioSettings | null>;
      }
      return settingsService.get();
    },

    save: async (settings: StudioSettings): Promise<void> => {
      if (isApiMode()) {
        await settingsApi.save(settings);
        // Update localStorage cache
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        return;
      }
      settingsService.save(settings);
    },

    getOrDefault: async (): Promise<StudioSettings> => {
      if (isApiMode()) {
        const settings = await settingsApi.get() as StudioSettings | null;
        return settings || DEFAULT_STUDIO_SETTINGS;
      }
      return settingsService.getOrDefault();
    },

    updatePartial: async (updates: Partial<StudioSettings>): Promise<StudioSettings> => {
      if (isApiMode()) {
        return settingsApi.updatePartial(updates) as Promise<StudioSettings>;
      }
      return settingsService.updatePartial(updates);
    },
  },
};
