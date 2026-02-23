/**
 * useFreshData Hook
 *
 * Fetches fresh data from API on component mount, with TTL-based caching.
 * If data was fetched within the cache window (default 2 minutes), skips the API call
 * and renders immediately using cached localStorage data.
 *
 * Used by admin and member pages to balance freshness with performance.
 */

import { useState, useEffect } from 'react';
import { syncFeatureData, isApiMode } from '../services';

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
  refetch: () => Promise<void>;
}

// Cache TTL: skip API fetch if data was synced within this many milliseconds
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Track when each data type was last successfully synced from API
const lastSyncTimestamps: Record<string, number> = {};

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
 * @param dataTypes - Array of data types to fetch (e.g., ['members', 'subscriptions'])
 * @returns { isLoading, error, refetch } - Loading state, error, and manual refetch function
 *
 * @example
 * function MemberListPage() {
 *   const { isLoading } = useFreshData(['members', 'subscriptions']);
 *   if (isLoading) return <PageLoading />;
 *   // ... render page
 * }
 */
export function useFreshData(dataTypes: DataType[]): UseFreshDataResult {
  // If all data is fresh, skip loading state entirely — render immediately from localStorage
  const needsFetch = isApiMode() && !allDataFresh(dataTypes);
  const [isLoading, setIsLoading] = useState(needsFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (forceRefresh = false) => {
    // In localStorage mode, no need to fetch - data is already available
    if (!isApiMode()) {
      setIsLoading(false);
      return;
    }

    // Determine which types actually need fetching
    const typesToFetch = forceRefresh ? dataTypes : getStaleTypes(dataTypes);

    if (typesToFetch.length === 0) {
      // All data is fresh — no API call needed
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await syncFeatureData(typesToFetch);
      markSynced(typesToFetch);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Empty dependency - runs once on mount

  // Refetch function for manual refresh (always forces fresh fetch)
  const refetch = async () => {
    await fetchData(true);
  };

  return { isLoading, error, refetch };
}
