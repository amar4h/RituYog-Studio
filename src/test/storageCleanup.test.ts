import { describe, it, expect, beforeEach } from 'vitest';
import { getStorageUsage, removeLegacyKeys } from '../utils/storageCleanup';
import { STORAGE_KEYS } from '../constants';

beforeEach(() => {
  localStorage.clear();
});

describe('getStorageUsage', () => {
  it('returns empty report when no data', () => {
    const report = getStorageUsage();
    expect(report.entries).toHaveLength(0);
    expect(report.totalBytes).toBe(0);
  });

  it('reports size for stored data', () => {
    const data = [{ id: '1', name: 'Test' }];
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(data));

    const report = getStorageUsage();
    expect(report.entries.length).toBeGreaterThan(0);
    expect(report.totalBytes).toBeGreaterThan(0);

    const membersEntry = report.entries.find(e => e.key === STORAGE_KEYS.MEMBERS);
    expect(membersEntry).toBeDefined();
    expect(membersEntry!.itemCount).toBe(1);
  });
});

describe('removeLegacyKeys', () => {
  it('removes legacy keys that exist', () => {
    localStorage.setItem(STORAGE_KEYS.INSTRUCTORS, '[]');
    localStorage.setItem(STORAGE_KEYS.CLASSES, '[]');

    const removed = removeLegacyKeys();
    expect(removed).toContain(STORAGE_KEYS.INSTRUCTORS);
    expect(removed).toContain(STORAGE_KEYS.CLASSES);
    expect(localStorage.getItem(STORAGE_KEYS.INSTRUCTORS)).toBeNull();
  });

  it('returns empty array when no legacy keys exist', () => {
    const removed = removeLegacyKeys();
    expect(removed).toHaveLength(0);
  });
});
