/**
 * useFreshData Hook
 *
 * Fetches fresh data from API on component mount, with TTL-based caching
 * and stale-while-revalidate pattern.
 *
 * - If data was fetched within TTL: renders immediately, no API call.
 * - If TTL expired but localStorage has cached data: renders immediately from cache,
 *   then silently refreshes in the background.
 * - If no cached data at all: shows loading spinner while fetching.
 *
 * Used by admin and member pages to balance freshness with performance.
 */

import { useState, useEffect, useCallback } from 'react';
import { syncFeatureData, isApiMode } from '../services';
import { STORAGE_KEYS } from '../constants';

export type DataType =
  | 'members'
  | 'leads'
  | 'subscriptions'
  | 'invoices'
  | 'payments'
  | 'attendance'
  | 'attendance-locks'
  | 'notification-logs'
  | 'slots'
  | 'plans'
  | 'settings'
  | 'products'
  | 'inventory'
  | 'expenses'
  // Session Planning
  | 'asanas'
  | 'session-plans'
  | 'session-plan-allocations'
  | 'session-executions';

interface UseFreshDataResult {
  isLoading: boolean;
  error: string | null;
  dataVersion: number;
  refetch: () => Promise<void>;
}

// Cache TTL: skip API fetch if data was synced within this many milliseconds
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Track when each data type was last successfully synced from API
const lastSyncTimestamps: Record<string, number> = {};

// Map DataType to localStorage key for cache checking
const DATA_TYPE_TO_STORAGE_KEY: Record<DataType, string> = {
  members: STORAGE_KEYS.MEMBERS,
  leads: STORAGE_KEYS.LEADS,
  subscriptions: STORAGE_KEYS.SUBSCRIPTIONS,
  invoices: STORAGE_KEYS.INVOICES,
  payments: STORAGE_KEYS.PAYMENTS,
  attendance: STORAGE_KEYS.ATTENDANCE,
  'attendance-locks': STORAGE_KEYS.ATTENDANCE_LOCKS,
  'notification-logs': STORAGE_KEYS.NOTIFICATION_LOGS,
  slots: STORAGE_KEYS.SESSION_SLOTS,
  plans: STORAGE_KEYS.MEMBERSHIP_PLANS,
  settings: STORAGE_KEYS.SETTINGS,
  products: STORAGE_KEYS.PRODUCTS,
  inventory: STORAGE_KEYS.INVENTORY_TRANSACTIONS,
  expenses: STORAGE_KEYS.EXPENSES,
  asanas: STORAGE_KEYS.ASANAS,
  'session-plans': STORAGE_KEYS.SESSION_PLANS,
  'session-plan-allocations': STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS,
  'session-executions': STORAGE_KEYS.SESSION_EXECUTIONS,
};

/**
 * Check if localStorage has non-empty data for all requested types
 */
function hasLocalData(dataTypes: DataType[]): boolean {
  return dataTypes.every(dt => {
    const key = DATA_TYPE_TO_STORAGE_KEY[dt];
    if (!key) return false;
    const data = localStorage.getItem(key);
    if (!data) return false;
    // Settings is a single object, others are arrays
    if (dt === 'settings') return data !== 'null';
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  });
}

/**
 * Check if all requested data types are still fresh (within TTL)
 */
function allDataFresh(dataTypes: DataType[]): boolean {
  const now = Date.now();
  return dataTypes.every(dt => {
    const lastSync = lastSyncTimestamps[dt];
    return lastSync != null && (now - lastSync) < CACHE_TTL_MS;
  });
}

/**
 * Mark data types as freshly synced
 */
export function markSynced(dataTypes: DataType[]): void {
  const now = Date.now();
  for (const dt of dataTypes) {
    lastSyncTimestamps[dt] = now;
  }
}

/**
 * Invalidate cache for specific data types so next useFreshData call fetches from API
 */
export function invalidateCache(dataTypes: DataType[]): void {
  for (const dt of dataTypes) {
    delete lastSyncTimestamps[dt];
  }
}

/**
 * Get only the stale data types that need fetching
 */
function getStaleTypes(dataTypes: DataType[]): DataType[] {
  const now = Date.now();
  return dataTypes.filter(dt => {
    const lastSync = lastSyncTimestamps[dt];
    return lastSync == null || (now - lastSync) >= CACHE_TTL_MS;
  });
}

/**
 * Hook to fetch fresh data from API when component mounts
 *
 * Uses stale-while-revalidate: if localStorage has cached data but TTL expired,
 * renders immediately from cache and refreshes silently in the background.
 * Only shows a loading spinner when there is no cached data at all.
 *
 * @param dataTypes - Array of data types to fetch (e.g., ['members', 'subscriptions'])
 * @returns { isLoading, error, dataVersion, refetch }
 */
export function useFreshData(dataTypes: DataType[]): UseFreshDataResult {
  const needsFetch = isApiMode() && !allDataFresh(dataTypes);
  // Only block with spinner if we need to fetch AND there's no cached data to show
  const shouldBlock = needsFetch && !hasLocalData(dataTypes);
  const [isLoading, setIsLoading] = useState(shouldBlock);
  const [error, setError] = useState<string | null>(null);
  // Incremented after background refresh completes, triggers re-render with fresh data
  const [dataVersion, setDataVersion] = useState(0);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isApiMode()) {
      setIsLoading(false);
      return;
    }

    const typesToFetch = forceRefresh ? dataTypes : getStaleTypes(dataTypes);

    if (typesToFetch.length === 0) {
      setIsLoading(false);
      return;
    }

    // Only show spinner if no cached data (first load)
    const hasCached = hasLocalData(dataTypes);
    if (!hasCached) {
      setIsLoading(true);
    }
    setError(null);

    try {
      await syncFeatureData(typesToFetch);
      markSynced(typesToFetch);
      setIsLoading(false);
      // Bump version to trigger re-render with fresh data after background refresh
      setDataVersion(v => v + 1);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setIsLoading(false);
    }
  }, [dataTypes]);

  useEffect(() => {
    fetchData();
  }, []); // Empty dependency - runs once on mount

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return { isLoading, error, dataVersion, refetch };
}
