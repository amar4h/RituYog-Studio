/**
 * useFreshData Hook
 *
 * Fetches fresh data from API on component mount.
 * Used by admin pages to ensure they always show the latest data.
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

/**
 * Hook to fetch fresh data from API when component mounts
 *
 * @param dataTypes - Array of data types to fetch (e.g., ['members', 'subscriptions'])
 * @returns { isLoading, error } - Loading state and any error message
 *
 * @example
 * function MemberListPage() {
 *   const { isLoading } = useFreshData(['members', 'subscriptions']);
 *   if (isLoading) return <PageLoading />;
 *   // ... render page
 * }
 */
export function useFreshData(dataTypes: DataType[]): UseFreshDataResult {
  const [isLoading, setIsLoading] = useState(isApiMode());
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    // In localStorage mode, no need to fetch - data is already available
    if (!isApiMode()) {
      setIsLoading(false);
      return;
    }

    // Fetch fresh data from API
    setIsLoading(true);
    setError(null);

    try {
      await syncFeatureData(dataTypes);
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

  // Refetch function for manual refresh
  const refetch = async () => {
    await fetchData();
  };

  return { isLoading, error, refetch };
}
