/**
 * Shared helper functions for storage services
 * Generic CRUD operations, API write helpers, and dual-mode utilities
 */

import { v4 as uuidv4 } from 'uuid';
import { isApiMode } from '../api';
import type { BaseEntity } from '../../types';
import { STORAGE_KEYS } from '../../constants';

// ============================================
// GENERIC CRUD OPERATIONS
// ============================================

export function getAll<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading from storage (${key}):`, error);
    return [];
  }
}

export function saveAll<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to storage (${key}):`, error);
    throw new Error('Failed to save data. Storage may be full.');
  }
}

export function getById<T extends BaseEntity>(key: string, id: string): T | null {
  const items = getAll<T>(key);
  return items.find(item => item.id === id) || null;
}

export function create<T extends BaseEntity>(
  key: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): T {
  const items = getAll<T>(key);
  const now = new Date().toISOString();
  const newItem = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  } as T;
  items.push(newItem);
  saveAll(key, items);
  return newItem;
}

export function update<T extends BaseEntity>(
  key: string,
  id: string,
  data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
): T | null {
  const items = getAll<T>(key);
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;

  const updatedItem = {
    ...items[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  items[index] = updatedItem;
  saveAll(key, items);
  return updatedItem;
}

export function remove<T extends BaseEntity>(key: string, id: string): boolean {
  const items = getAll<T>(key);
  const filteredItems = items.filter(item => item.id !== id);
  if (filteredItems.length === items.length) return false;
  saveAll(key, filteredItems);
  return true;
}

// ============================================
// API WRITE (Synchronous write to API)
// In API mode, all writes go to MySQL immediately
// ============================================

// CHANGE 3 (v1.0.2): Cursor state management for save operations
// Uses a counter to handle multiple concurrent operations
let waitingStyleElement: HTMLStyleElement | null = null;
let pendingOperations = 0;

/**
 * CHANGE 3: Set cursor to waiting state during save operations.
 * Uses a <style> tag with !important to override all cursor styles.
 * Counter-based: cursor stays in wait state until ALL operations complete.
 */
export function setWaitingCursor(waiting: boolean): void {
  if (typeof document === 'undefined') return;

  // Track pending operations to handle concurrent saves
  if (waiting) {
    pendingOperations++;
  } else {
    pendingOperations = Math.max(0, pendingOperations - 1);
  }

  // Only update cursor if transitioning between states
  const shouldShowWait = pendingOperations > 0;

  if (shouldShowWait) {
    // Create and inject style element with global cursor override
    if (!waitingStyleElement) {
      waitingStyleElement = document.createElement('style');
      waitingStyleElement.id = 'yoga-studio-waiting-cursor';
      document.head.appendChild(waitingStyleElement);
    }
    waitingStyleElement.textContent = '*, *::before, *::after { cursor: wait !important; }';
  } else {
    // Remove the style to restore normal cursors
    if (waitingStyleElement) {
      waitingStyleElement.textContent = '';
    }
  }
}

/**
 * CHANGE 2 & 3 (v1.0.2): Perform API write operation with cursor feedback
 * - Uses async fetch (sync XHR is deprecated and may fail silently)
 * - Shows waiting cursor during operation
 * - localStorage is written first for immediate UI responsiveness
 * - API write happens asynchronously but reliably
 */
// Track in-flight API writes so syncFeatureData can wait for them
const pendingApiWrites = new Set<Promise<void>>();

/**
 * Wait for all pending API writes to complete.
 * Called by syncFeatureData to avoid overwriting localStorage with stale API data.
 */
export async function waitForPendingWrites(): Promise<void> {
  if (pendingApiWrites.size > 0) {
    await Promise.all(pendingApiWrites);
  }
}

export function performApiWrite(operation: {
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  id?: string;
  data?: unknown;
}): void {
  if (!isApiMode()) return;

  const baseUrl = import.meta.env.VITE_API_URL || '/api';
  const apiKey = import.meta.env.VITE_API_KEY || '';

  let url = `${baseUrl}/${operation.endpoint}`;
  let method = 'POST';

  if (operation.type === 'create') {
    url += '?action=create';
    method = 'POST';
  } else if (operation.type === 'update') {
    url += `?action=update&id=${operation.id}`;
    method = 'PUT';
  } else if (operation.type === 'delete') {
    url += `?action=delete&id=${operation.id}`;
    method = 'DELETE';
  }

  // CHANGE 3: Show waiting cursor during API operation
  setWaitingCursor(true);

  // CHANGE 2: Use async fetch for reliable API writes (sync XHR is deprecated)
  const writePromise = fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: operation.data ? JSON.stringify(operation.data) : undefined,
  })
    .then(response => {
      if (!response.ok) {
        console.error(`[API Write] ${operation.type} ${operation.endpoint} failed:`, response.status);
      } else {
        console.log(`[API Write] ${operation.type} ${operation.endpoint} success`);
      }
    })
    .catch(error => {
      console.error('[API Write] Network error:', error);
    })
    .finally(() => {
      // CHANGE 3: Restore cursor after operation completes
      setWaitingCursor(false);
      pendingApiWrites.delete(writePromise);
    });

  pendingApiWrites.add(writePromise);
}

// Storage key to endpoint mapping
export const STORAGE_KEY_TO_ENDPOINT: Record<string, string> = {
  [STORAGE_KEYS.MEMBERS]: 'members',
  [STORAGE_KEYS.LEADS]: 'leads',
  [STORAGE_KEYS.SUBSCRIPTIONS]: 'subscriptions',
  [STORAGE_KEYS.SESSION_SLOTS]: 'slots',
  [STORAGE_KEYS.MEMBERSHIP_PLANS]: 'plans',
  [STORAGE_KEYS.INVOICES]: 'invoices',
  [STORAGE_KEYS.PAYMENTS]: 'payments',
  [STORAGE_KEYS.ATTENDANCE]: 'attendance',
  [STORAGE_KEYS.TRIAL_BOOKINGS]: 'trials',
  [STORAGE_KEYS.PRODUCTS]: 'products',
  [STORAGE_KEYS.INVENTORY_TRANSACTIONS]: 'inventory',
  [STORAGE_KEYS.EXPENSES]: 'expenses',
  // Session Planning
  [STORAGE_KEYS.ASANAS]: 'asanas',
  [STORAGE_KEYS.SESSION_PLANS]: 'session-plans',
  [STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS]: 'session-plan-allocations',
  [STORAGE_KEYS.SESSION_EXECUTIONS]: 'session-executions',
};

// Dual-mode create: updates localStorage AND immediately writes to API
export function createDual<T extends BaseEntity>(
  key: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): T {
  const newItem = create<T>(key, data);

  const endpoint = STORAGE_KEY_TO_ENDPOINT[key];
  if (endpoint) {
    performApiWrite({ type: 'create', endpoint, data: newItem });
  }

  return newItem;
}

// Dual-mode update: updates localStorage AND immediately writes to API
export function updateDual<T extends BaseEntity>(
  key: string,
  id: string,
  data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
): T | null {
  const updatedItem = update<T>(key, id, data);

  if (updatedItem) {
    const endpoint = STORAGE_KEY_TO_ENDPOINT[key];
    if (endpoint) {
      performApiWrite({ type: 'update', endpoint, id, data: updatedItem });
    }
  }

  return updatedItem;
}

// Dual-mode delete: updates localStorage AND immediately writes to API
export function removeDual<T extends BaseEntity>(key: string, id: string): boolean {
  const result = remove<T>(key, id);

  if (result) {
    const endpoint = STORAGE_KEY_TO_ENDPOINT[key];
    if (endpoint) {
      performApiWrite({ type: 'delete', endpoint, id });
    }
  }

  return result;
}
