/**
 * Data Sync from API to localStorage
 * Enables existing sync methods to work with API data
 */

import {
  isApiMode,
  membersApi,
  leadsApi,
  subscriptionsApi,
  slotsApi,
  invoicesApi,
  paymentsApi,
  attendanceApi,
  settingsApi,
  productsApi,
  inventoryApi,
  expensesApi,
} from '../api';
import type {
  Member,
  Lead,
  MembershipSubscription,
  SessionSlot,
  Invoice,
  Payment,
  AttendanceRecord,
  Product,
  InventoryTransaction,
  Expense,
} from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { saveAll, waitForPendingWrites } from './helpers';
import { authService } from './authService';

const TIERED_API_URL = import.meta.env.VITE_API_URL || '/api';
const TIERED_API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Sync all data from API to localStorage
 * This allows existing synchronous methods to work seamlessly
 * Call this on app startup when in API mode
 */
export async function syncFromApi(): Promise<void> {
  if (!isApiMode()) {
    console.log('[Storage] localStorage mode - no sync needed');
    return;
  }

  console.log('[Storage] API mode - syncing data from server...');

  try {
    // Fetch all data from API in parallel
    const [
      members,
      leads,
      subscriptions,
      slots,
      plans,
      invoices,
      payments,
      attendance,
      settings,
      attendanceLocks,
      notificationLogs,
    ] = await Promise.all([
      membersApi.getAll().catch(() => []),
      leadsApi.getAll().catch(() => []),
      subscriptionsApi.getAll().catch(() => []),
      slotsApi.getAll().catch(() => []),
      slotsApi.getAll().catch(() => []), // Plans use slots endpoint for now
      invoicesApi.getAll().catch(() => []),
      paymentsApi.getAll().catch(() => []),
      attendanceApi.getAll().catch(() => []),
      settingsApi.get().catch(() => null),
      // Fetch attendance locks
      fetch(`${import.meta.env.VITE_API_URL || '/api'}/attendance-locks`, {
        headers: { 'X-API-Key': import.meta.env.VITE_API_KEY || '' },
      }).then(r => r.json()).catch(() => ({})),
      // Fetch notification logs
      fetch(`${import.meta.env.VITE_API_URL || '/api'}/notification-logs`, {
        headers: { 'X-API-Key': import.meta.env.VITE_API_KEY || '' },
      }).then(r => r.json()).catch(() => []),
    ]);

    // Also fetch membership plans separately
    const plansData = await fetch(
      `${import.meta.env.VITE_API_URL || '/api'}/plans`,
      {
        headers: {
          'X-API-Key': import.meta.env.VITE_API_KEY || '',
        },
      }
    ).then(r => r.json()).catch(() => []);

    // Store in localStorage
    saveAll(STORAGE_KEYS.MEMBERS, members as Member[]);
    saveAll(STORAGE_KEYS.LEADS, leads as Lead[]);
    saveAll(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions as MembershipSubscription[]);
    saveAll(STORAGE_KEYS.SESSION_SLOTS, slots as SessionSlot[]);
    saveAll(STORAGE_KEYS.MEMBERSHIP_PLANS, Array.isArray(plansData) ? plansData : plansData.data || []);
    saveAll(STORAGE_KEYS.INVOICES, invoices as Invoice[]);
    saveAll(STORAGE_KEYS.PAYMENTS, payments as Payment[]);
    saveAll(STORAGE_KEYS.ATTENDANCE, attendance as AttendanceRecord[]);

    if (settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    // Store attendance locks
    if (attendanceLocks && typeof attendanceLocks === 'object') {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_LOCKS, JSON.stringify(attendanceLocks));
    }

    // Store notification logs
    if (Array.isArray(notificationLogs)) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_LOGS, JSON.stringify(notificationLogs));
    }

    // Mark sync as completed
    localStorage.setItem('yoga_studio_api_synced', new Date().toISOString());

    console.log('[Storage] Sync complete:', {
      members: (members as Member[]).length,
      leads: (leads as Lead[]).length,
      subscriptions: (subscriptions as MembershipSubscription[]).length,
      slots: (slots as SessionSlot[]).length,
      invoices: (invoices as Invoice[]).length,
      payments: (payments as Payment[]).length,
      attendance: (attendance as AttendanceRecord[]).length,
    });
  } catch (error) {
    console.error('[Storage] Sync failed:', error);
    throw error;
  }
}

/**
 * Check if data has been synced from API
 */
export function isApiSynced(): boolean {
  return localStorage.getItem('yoga_studio_api_synced') !== null;
}

/**
 * Clear sync flag to force re-sync
 */
export function clearApiSync(): void {
  localStorage.removeItem('yoga_studio_api_synced');
}

/**
 * Sync only essential data (settings, slots, plans)
 * Used on app startup for fast initial load
 */
export async function syncEssentialData(): Promise<void> {
  if (!isApiMode()) {
    console.log('[Storage] localStorage mode - no essential sync needed');
    return;
  }

  // If not authenticated, only fetch settings (for favicon/branding).
  // This keeps the login page fast — no need to load members, invoices, etc.
  const isLoggedIn = authService.isAuthenticated();

  if (!isLoggedIn) {
    console.log('[Storage] Not authenticated — loading settings + slots for public pages');
    try {
      const [settings, slots] = await Promise.all([
        settingsApi.get().catch(() => null),
        slotsApi.getActive().catch(() => []),
      ]);
      if (settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      }
      if (Array.isArray(slots) && slots.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SESSION_SLOTS, JSON.stringify(slots));
      }
    } catch (error) {
      console.error('[Storage] Public data sync failed:', error);
    }
    return;
  }

  console.log('[Storage] Syncing essential + common data...');

  // Import markSynced to update TTL cache so useFreshData skips re-fetching
  const { markSynced } = await import('../../hooks/useFreshData');

  try {
    // Fetch essential (settings, slots, plans) + common data (members, subscriptions,
    // leads, invoices, payments) in a single parallel batch on startup.
    // This way the dashboard (and most admin pages) render instantly from cache.
    const [slots, settings, plansData, members, subscriptions, leads, invoices, payments] = await Promise.all([
      slotsApi.getAll().catch(() => []),
      settingsApi.get().catch(() => null),
      fetch(`${TIERED_API_URL}/plans`, {
        headers: { 'X-API-Key': TIERED_API_KEY },
      }).then(r => r.json()).catch(() => []),
      membersApi.getAll().catch(() => []),
      subscriptionsApi.getAll().catch(() => []),
      leadsApi.getAll().catch(() => []),
      invoicesApi.getAll().catch(() => []),
      paymentsApi.getAll().catch(() => []),
    ]);

    // Store in localStorage
    saveAll(STORAGE_KEYS.SESSION_SLOTS, slots as SessionSlot[]);
    saveAll(STORAGE_KEYS.MEMBERSHIP_PLANS, Array.isArray(plansData) ? plansData : plansData.data || []);
    saveAll(STORAGE_KEYS.MEMBERS, members as Member[]);
    saveAll(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions as MembershipSubscription[]);
    saveAll(STORAGE_KEYS.LEADS, leads as Lead[]);
    saveAll(STORAGE_KEYS.INVOICES, invoices as Invoice[]);
    saveAll(STORAGE_KEYS.PAYMENTS, payments as Payment[]);

    if (settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    // Mark all pre-fetched types in TTL cache so useFreshData skips re-fetching
    markSynced(['slots', 'plans', 'settings', 'members', 'subscriptions', 'leads', 'invoices', 'payments']);

    // Mark essential sync as completed
    localStorage.setItem('yoga_studio_essential_synced', new Date().toISOString());

    console.log('[Storage] Essential sync complete:', {
      slots: (slots as SessionSlot[]).length,
      plans: (Array.isArray(plansData) ? plansData : plansData.data || []).length,
      members: (members as Member[]).length,
      settings: settings ? 'loaded' : 'none',
    });
  } catch (error) {
    console.error('[Storage] Essential sync failed:', error);
    throw error;
  }
}

/**
 * Sync specific feature data on demand
 * Used by admin pages to fetch fresh data
 */
export async function syncFeatureData(features: string[]): Promise<void> {
  if (!isApiMode()) {
    console.log('[Storage] localStorage mode - no feature sync needed');
    return;
  }

  // Wait for any in-flight API writes to complete before fetching,
  // otherwise we may overwrite localStorage with stale data from the server
  await waitForPendingWrites();

  console.log('[Storage] Syncing feature data:', features);

  const fetchers: Record<string, () => Promise<void>> = {
    members: async () => {
      const data = await membersApi.getAll().catch(() => []);
      saveAll(STORAGE_KEYS.MEMBERS, data as Member[]);
    },
    leads: async () => {
      const data = await leadsApi.getAll().catch(() => []);
      saveAll(STORAGE_KEYS.LEADS, data as Lead[]);
    },
    subscriptions: async () => {
      const data = await subscriptionsApi.getAll().catch(() => []);
      saveAll(STORAGE_KEYS.SUBSCRIPTIONS, data as MembershipSubscription[]);
    },
    invoices: async () => {
      const data = await invoicesApi.getAll().catch(() => []);
      saveAll(STORAGE_KEYS.INVOICES, data as Invoice[]);
    },
    payments: async () => {
      const data = await paymentsApi.getAll().catch(() => []);
      saveAll(STORAGE_KEYS.PAYMENTS, data as Payment[]);
    },
    attendance: async () => {
      const data = await attendanceApi.getAll().catch(() => []);
      saveAll(STORAGE_KEYS.ATTENDANCE, data as AttendanceRecord[]);
    },
    'attendance-locks': async () => {
      const data = await fetch(`${TIERED_API_URL}/attendance-locks`, {
        headers: { 'X-API-Key': TIERED_API_KEY },
      }).then(r => r.json()).catch(() => ({}));
      if (data && typeof data === 'object') {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE_LOCKS, JSON.stringify(data));
      }
    },
    'notification-logs': async () => {
      const data = await fetch(`${TIERED_API_URL}/notification-logs`, {
        headers: { 'X-API-Key': TIERED_API_KEY },
      }).then(r => r.json()).catch(() => []);
      if (Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATION_LOGS, JSON.stringify(data));
      }
    },
    slots: async () => {
      const data = await slotsApi.getAll().catch(() => []);
      saveAll(STORAGE_KEYS.SESSION_SLOTS, data as SessionSlot[]);
    },
    plans: async () => {
      const data = await fetch(`${TIERED_API_URL}/plans`, {
        headers: { 'X-API-Key': TIERED_API_KEY },
      }).then(r => r.json()).catch(() => []);
      saveAll(STORAGE_KEYS.MEMBERSHIP_PLANS, Array.isArray(data) ? data : data.data || []);
    },
    settings: async () => {
      const data = await settingsApi.get().catch(() => null);
      if (data) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
      }
    },
    // Inventory & Expenses
    products: async () => {
      const data = await productsApi.getAll().catch(() => []);
      saveAll(STORAGE_KEYS.PRODUCTS, data as Product[]);
    },
    inventory: async () => {
      const data = await inventoryApi.getAll().catch(() => []);
      saveAll(STORAGE_KEYS.INVENTORY_TRANSACTIONS, data as InventoryTransaction[]);
    },
    expenses: async () => {
      const data = await expensesApi.getAll().catch(() => []);
      saveAll(STORAGE_KEYS.EXPENSES, data as Expense[]);
    },
    // Session Planning
    asanas: async () => {
      const data = await fetch(`${TIERED_API_URL}/asanas`, {
        headers: { 'X-API-Key': TIERED_API_KEY },
      }).then(r => r.json()).catch(() => []);
      saveAll(STORAGE_KEYS.ASANAS, Array.isArray(data) ? data : data.data || []);
    },
    'session-plans': async () => {
      const data = await fetch(`${TIERED_API_URL}/session-plans`, {
        headers: { 'X-API-Key': TIERED_API_KEY },
      }).then(r => r.json()).catch(() => []);
      saveAll(STORAGE_KEYS.SESSION_PLANS, Array.isArray(data) ? data : data.data || []);
    },
    'session-plan-allocations': async () => {
      const data = await fetch(`${TIERED_API_URL}/session-plan-allocations`, {
        headers: { 'X-API-Key': TIERED_API_KEY },
      }).then(r => r.json()).catch(() => []);
      saveAll(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS, Array.isArray(data) ? data : data.data || []);
    },
    'session-executions': async () => {
      const data = await fetch(`${TIERED_API_URL}/session-executions`, {
        headers: { 'X-API-Key': TIERED_API_KEY },
      }).then(r => r.json()).catch(() => []);
      saveAll(STORAGE_KEYS.SESSION_EXECUTIONS, Array.isArray(data) ? data : data.data || []);
    },
  };

  // Fetch all requested features in parallel
  const promises = features
    .filter(f => fetchers[f])
    .map(f => fetchers[f]());

  await Promise.all(promises);

  console.log('[Storage] Feature sync complete for:', features);
}
