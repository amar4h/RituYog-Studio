/**
 * localStorage Cleanup Utility
 *
 * Provides tools to analyze storage usage, archive old data,
 * and free up space in localStorage.
 */

import { STORAGE_KEYS } from '../constants';

interface StorageUsageEntry {
  key: string;
  sizeBytes: number;
  sizeKB: string;
  itemCount: number | null;
}

interface StorageUsageReport {
  entries: StorageUsageEntry[];
  totalBytes: number;
  totalKB: string;
  totalMB: string;
  capacityUsedPercent: string;
}

/**
 * Get approximate localStorage capacity used.
 * Most browsers allow ~5-10MB per origin.
 */
export function getStorageUsage(): StorageUsageReport {
  const entries: StorageUsageEntry[] = [];
  let totalBytes = 0;

  // Only measure yoga_studio keys
  const studioKeys = Object.values(STORAGE_KEYS);

  for (const key of studioKeys) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    const sizeBytes = new Blob([value]).size;
    totalBytes += sizeBytes;

    let itemCount: number | null = null;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        itemCount = parsed.length;
      }
    } catch {
      // Not JSON array, skip count
    }

    entries.push({
      key,
      sizeBytes,
      sizeKB: (sizeBytes / 1024).toFixed(1),
      itemCount,
    });
  }

  // Also measure non-studio keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || studioKeys.includes(key as typeof studioKeys[number])) continue;
    if (!key.startsWith('yoga_studio')) continue;

    const value = localStorage.getItem(key);
    if (!value) continue;
    const sizeBytes = new Blob([value]).size;
    totalBytes += sizeBytes;

    entries.push({
      key,
      sizeBytes,
      sizeKB: (sizeBytes / 1024).toFixed(1),
      itemCount: null,
    });
  }

  // Sort by size descending
  entries.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const estimatedCapacity = 5 * 1024 * 1024; // 5MB typical limit
  return {
    entries,
    totalBytes,
    totalKB: (totalBytes / 1024).toFixed(1),
    totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
    capacityUsedPercent: ((totalBytes / estimatedCapacity) * 100).toFixed(1),
  };
}

/**
 * Archive old attendance records beyond a given number of months.
 * Returns the archived data as a JSON string for download.
 */
export function archiveOldAttendance(monthsToKeep: number = 6): {
  archived: number;
  remaining: number;
  archiveData: string;
} {
  const key = STORAGE_KEYS.ATTENDANCE;
  const raw = localStorage.getItem(key);
  if (!raw) return { archived: 0, remaining: 0, archiveData: '[]' };

  const records = JSON.parse(raw);
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const keep: typeof records = [];
  const archive: typeof records = [];

  for (const record of records) {
    if (record.date < cutoffStr) {
      archive.push(record);
    } else {
      keep.push(record);
    }
  }

  if (archive.length > 0) {
    localStorage.setItem(key, JSON.stringify(keep));
  }

  return {
    archived: archive.length,
    remaining: keep.length,
    archiveData: JSON.stringify(archive, null, 2),
  };
}

/**
 * Remove legacy storage keys that are no longer used.
 */
export function removeLegacyKeys(): string[] {
  const legacyKeys = [
    STORAGE_KEYS.INSTRUCTORS,
    STORAGE_KEYS.CLASSES,
    STORAGE_KEYS.SCHEDULES,
    STORAGE_KEYS.BOOKINGS,
    STORAGE_KEYS.TRIAL_REQUESTS,
    STORAGE_KEYS.NOTIFICATIONS,
  ];

  const removed: string[] = [];
  for (const key of legacyKeys) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      removed.push(key);
    }
  }

  return removed;
}

/**
 * Print a formatted storage usage report to the console.
 * Useful for debugging in browser DevTools.
 */
export function printStorageReport(): void {
  const report = getStorageUsage();

  console.group('📊 localStorage Usage Report');
  console.log(`Total: ${report.totalKB} KB (${report.totalMB} MB) — ${report.capacityUsedPercent}% of ~5MB limit`);
  console.table(
    report.entries.map(e => ({
      Key: e.key.replace('yoga_studio_', ''),
      'Size (KB)': e.sizeKB,
      Items: e.itemCount ?? '—',
    }))
  );
  console.groupEnd();
}
