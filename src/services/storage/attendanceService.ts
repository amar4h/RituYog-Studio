/**
 * Attendance Service + Attendance Lock Service
 * Dual-mode: localStorage (default) or API
 */

import { isApiMode, attendanceApi } from '../api';
import type { AttendanceRecord, AttendanceStatus, Member } from '../../types';
import {
  STORAGE_KEYS,
  ATTENDANCE_LOCK_MIN_DAYS,
  ATTENDANCE_LOCK_MAX_DAYS,
  MS_PER_DAY,
} from '../../constants';
import { getAll, getById, createDual, updateDual, removeDual, setWaitingCursor } from './helpers';
import { getWorkingDaysInRange } from '../../utils/dateUtils';
import { memberService } from './memberService';
import { slotService } from './slotService';
import { subscriptionService } from './subscriptionService';
import { settingsService } from './settingsService';

// ============================================
// ATTENDANCE LOCK SERVICE
// Manages per-day lock/unlock state for attendance marking
// Lock state persists across browser/device changes via localStorage
// ============================================

interface AttendanceLockState {
  [key: string]: boolean; // "date:slotId" -> isLocked
}

// Helper to create composite key
const makeLockKey = (date: string, slotId: string): string => `${date}:${slotId}`;

export const attendanceLockService = {
  // Get all lock states
  getAll: (): AttendanceLockState => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_LOCKS);
    return data ? JSON.parse(data) : {};
  },

  // Save all lock states
  saveAll: (state: AttendanceLockState): void => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE_LOCKS, JSON.stringify(state));
  },

  // Check if a specific date+slot is locked
  isLocked: (date: string, slotId: string): boolean => {
    const state = attendanceLockService.getAll();
    const key = makeLockKey(date, slotId);
    return state[key] === true;
  },

  // Set lock state for a date+slot (with API sync)
  setLocked: (date: string, slotId: string, locked: boolean): void => {
    // Update localStorage first for immediate UI responsiveness
    const state = attendanceLockService.getAll();
    const key = makeLockKey(date, slotId);
    state[key] = locked;
    attendanceLockService.saveAll(state);

    // Sync to API if in API mode
    if (isApiMode()) {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const apiKey = import.meta.env.VITE_API_KEY || '';

      setWaitingCursor(true);
      fetch(`${baseUrl}/attendance-locks?action=setLock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ date, slotId, isLocked: locked }),
      })
        .then(response => {
          if (!response.ok) {
            console.error('[API Write] attendance-locks setLock failed:', response.status);
          } else {
            console.log('[API Write] attendance-locks setLock success');
          }
        })
        .catch(error => {
          console.error('[API Write] attendance-locks network error:', error);
        })
        .finally(() => {
          setWaitingCursor(false);
        });
    }
  },

  // Toggle lock state for a date+slot (with API sync)
  // IMPORTANT: Use getEffectiveLockState (not isLocked) to include default states
  toggleLock: (date: string, slotId: string): boolean => {
    const currentState = attendanceLockService.getEffectiveLockState(date, slotId);
    const newState = !currentState;
    attendanceLockService.setLocked(date, slotId, newState);
    return newState;
  },

  // Get default lock state for a date based on business rules:
  // - Current day: default UNLOCKED
  // - Previous 1-3 days: default LOCKED
  // - Future dates: N/A (blocked by validation anyway)
  getDefaultLockState: (date: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - targetDate.getTime()) / MS_PER_DAY);

    // Current day (daysDiff === 0): default UNLOCKED
    if (daysDiff === 0) {
      return false;
    }

    // Previous 1-3 days: default LOCKED
    if (daysDiff >= ATTENDANCE_LOCK_MIN_DAYS && daysDiff <= ATTENDANCE_LOCK_MAX_DAYS) {
      return true;
    }

    // Future or older than 3 days: locked by default (shouldn't be editable anyway)
    return true;
  },

  // Get effective lock state for date+slot (returns stored value if exists, else default)
  getEffectiveLockState: (date: string, slotId: string): boolean => {
    const state = attendanceLockService.getAll();
    const key = makeLockKey(date, slotId);
    if (key in state) {
      return state[key];
    }
    return attendanceLockService.getDefaultLockState(date);
  },

  // Check if attendance can be marked for a date+slot
  // Combines date validation rules with lock state
  canMarkAttendance: (date: string, slotId: string): { allowed: boolean; reason?: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - targetDate.getTime()) / MS_PER_DAY);

    // Block future dates
    if (daysDiff < 0) {
      return { allowed: false, reason: 'Cannot mark attendance for future dates' };
    }

    // Block dates older than 3 days
    if (daysDiff > ATTENDANCE_LOCK_MAX_DAYS) {
      return { allowed: false, reason: 'Cannot mark attendance for more than 3 days in the past' };
    }

    // Check lock state for this specific slot
    if (attendanceLockService.getEffectiveLockState(date, slotId)) {
      return { allowed: false, reason: 'Attendance for this session is locked' };
    }

    return { allowed: true };
  },
};

// ============================================
// ATTENDANCE SERVICE
// ============================================

export const attendanceService = {
  // Basic CRUD - dual-mode (localStorage + API queue)
  getAll: () => getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE),
  getById: (id: string) => getById<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, id),
  create: (data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, data),
  update: (id: string, data: Partial<AttendanceRecord>) =>
    updateDual<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, id, data),
  delete: (id: string) => removeDual<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, id),

  // Query methods
  getBySlotAndDate: (slotId: string, date: string): AttendanceRecord[] => {
    const records = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
    return records.filter(r => r.slotId === slotId && r.date === date);
  },

  getByMember: (memberId: string): AttendanceRecord[] => {
    const records = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
    return records
      .filter(r => r.memberId === memberId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getByMemberAndSlot: (memberId: string, slotId: string): AttendanceRecord[] => {
    const records = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
    return records
      .filter(r => r.memberId === memberId && r.slotId === slotId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getExistingRecord: (memberId: string, slotId: string, date: string): AttendanceRecord | null => {
    const records = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
    return records.find(r =>
      r.memberId === memberId &&
      r.slotId === slotId &&
      r.date === date
    ) || null;
  },

  // Business logic methods
  markAttendance: (
    memberId: string,
    slotId: string,
    date: string,
    status: AttendanceStatus,
    notes?: string
  ): AttendanceRecord => {
    const member = memberService.getById(memberId);
    if (!member) throw new Error('Member not found');

    const slot = slotService.getById(slotId);
    if (!slot) throw new Error('Slot not found');

    // Validate date constraints
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - attendanceDate.getTime()) / MS_PER_DAY);

    // CRITICAL: Block future dates - attendance can ONLY be marked for today or past
    if (daysDiff < 0) {
      throw new Error('Cannot mark attendance for future dates');
    }

    // Existing rule: Cannot mark attendance more than 3 days in the past
    if (daysDiff > ATTENDANCE_LOCK_MAX_DAYS) {
      throw new Error('Cannot mark attendance for more than 3 days in the past');
    }

    // Check if the day+slot is locked (respects both stored and default lock state)
    if (attendanceLockService.getEffectiveLockState(date, slotId)) {
      throw new Error('Attendance for this session is locked');
    }

    // Check for existing record
    const existing = attendanceService.getExistingRecord(memberId, slotId, date);

    if (existing) {
      // Update existing record
      const wasPresent = existing.status === 'present';
      const isNowPresent = status === 'present';

      // Update member's classesAttended counter based on status change
      if (!wasPresent && isNowPresent) {
        // Changed from absent to present: increment
        memberService.update(memberId, {
          classesAttended: (member.classesAttended || 0) + 1
        });
      } else if (wasPresent && !isNowPresent) {
        // Changed from present to absent: decrement
        memberService.update(memberId, {
          classesAttended: Math.max(0, (member.classesAttended || 0) - 1)
        });
      }

      return attendanceService.update(existing.id, {
        status,
        markedAt: new Date().toISOString(),
        notes,
      })!;
    }

    // Get active subscription for context
    const subscription = subscriptionService.getActiveMemberSubscription(memberId);

    // Create new record
    const record = attendanceService.create({
      memberId,
      slotId,
      date,
      status,
      subscriptionId: subscription?.id,
      markedAt: new Date().toISOString(),
      notes,
    });

    console.log('[Attendance] Created new record:', { id: record.id, memberId, slotId, date, status });

    // Auto-increment classesAttended if marked present
    if (status === 'present') {
      memberService.update(memberId, {
        classesAttended: (member.classesAttended || 0) + 1
      });
      console.log('[Attendance] Incremented classesAttended for member:', memberId);
    }

    // Verify record was saved to localStorage
    const allRecords = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
    const savedRecord = allRecords.find(r => r.id === record.id);
    console.log('[Attendance] Verified record in localStorage:', savedRecord ? 'FOUND' : 'NOT FOUND');

    return record;
  },

  // CHANGE 1 (v1.0.2): Calculate totalWorkingDays based ONLY on selected period
  // - DO NOT factor in member's membership start/end dates
  // - totalWorkingDays = working days (Mon-Fri) in selected period MINUS holidays
  // - This ensures consistent "X / Y" display across all members for same period
  getMemberSummaryForPeriod: (
    memberId: string,
    slotId: string,
    periodStart: string,
    periodEnd: string
  ): { presentDays: number; totalWorkingDays: number } => {
    // Get attendance records for this member across ALL slots in the period
    // (slot transfer should not reset attendance count)
    const records = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);

    // Count unique present DATES (not records) to avoid double-counting
    // if a member somehow has records in multiple slots for the same date
    const presentDates = new Set(
      records
        .filter(r =>
          r.memberId === memberId &&
          r.date >= periodStart &&
          r.date <= periodEnd &&
          r.status === 'present'
        )
        .map(r => r.date)
    );

    const presentDays = presentDates.size;

    const settings = settingsService.get();
    const holidays = settings?.holidays || [];

    // If periodEnd is today and the member's slot hasn't started yet,
    // exclude today — can't penalize for a session that hasn't run
    const today = new Date().toISOString().split('T')[0];
    let effectivePeriodEnd = periodEnd;
    if (periodEnd >= today && slotId) {
      const slot = slotService.getById(slotId);
      if (slot) {
        const now = new Date();
        const [hh, mm] = slot.startTime.split(':').map(Number);
        const slotStart = new Date();
        slotStart.setHours(hh, mm, 0, 0);
        if (now < slotStart && periodEnd === today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          effectivePeriodEnd = yesterday.toISOString().split('T')[0];
        }
      }
    }

    // Count working days (Mon-Fri + extra working days) in the selected period, excluding holidays
    // Same for ALL members — does NOT factor in subscription dates
    const extraWorkingDays = settings?.extraWorkingDays || [];
    const workingDays = effectivePeriodEnd >= periodStart
      ? getWorkingDaysInRange(periodStart, effectivePeriodEnd, extraWorkingDays)
      : [];
    const totalWorkingDays = workingDays.filter(date => {
      // Extra working days override holidays
      if (extraWorkingDays.some(d => d.date === date)) return true;
      const isHolidayDate = holidays.some(h => {
        if (h.date === date) return true;
        if (h.isRecurringYearly) {
          const holidayMonthDay = h.date.substring(5); // "MM-DD"
          const dateMonthDay = date.substring(5);
          return holidayMonthDay === dateMonthDay;
        }
        return false;
      });
      return !isHolidayDate;
    }).length;

    return { presentDays, totalWorkingDays };
  },

  // Check if member is marked present for a specific date
  isMarkedPresent: (memberId: string, slotId: string, date: string): boolean => {
    const record = attendanceService.getExistingRecord(memberId, slotId, date);
    return record?.status === 'present';
  },

  // Get all members with attendance status for a slot on a date
  getSlotAttendanceWithMembers: (
    slotId: string,
    date: string,
    periodStart: string,
    periodEnd: string
  ): Array<{
    member: Member;
    isPresent: boolean;
    presentDays: number;
    totalWorkingDays: number;
  }> => {
    // Get subscriptions for this slot on this date (active + expired whose dates cover it)
    // Deduplicate by memberId so a member with renewed subscription doesn't appear twice
    const allSubscriptions = subscriptionService.getActiveForSlotOnDate(slotId, date);
    const seenMembers = new Set<string>();
    const subscriptions = allSubscriptions.filter(s => {
      if (seenMembers.has(s.memberId)) return false;
      seenMembers.add(s.memberId);
      return true;
    });

    return subscriptions.map(sub => {
      const member = memberService.getById(sub.memberId);
      if (!member) return null;

      const isPresent = attendanceService.isMarkedPresent(sub.memberId, slotId, date);
      const summary = attendanceService.getMemberSummaryForPeriod(
        sub.memberId,
        slotId,
        periodStart,
        periodEnd
      );

      return {
        member,
        isPresent,
        presentDays: summary.presentDays,
        totalWorkingDays: summary.totalWorkingDays,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  },

  // Export to CSV
  exportToCSV: (records: AttendanceRecord[]): string => {
    const headers = ['Date', 'Member Name', 'Slot', 'Status', 'Marked At'];
    const rows = records.map(r => {
      const member = memberService.getById(r.memberId);
      const slot = slotService.getById(r.slotId);
      return [
        r.date,
        member ? `${member.firstName} ${member.lastName}` : 'Unknown',
        slot?.displayName || 'Unknown',
        r.status,
        r.markedAt,
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    getAll: async (): Promise<AttendanceRecord[]> => {
      if (isApiMode()) {
        return attendanceApi.getAll() as Promise<AttendanceRecord[]>;
      }
      return getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
    },

    getById: async (id: string): Promise<AttendanceRecord | null> => {
      if (isApiMode()) {
        return attendanceApi.getById(id) as Promise<AttendanceRecord | null>;
      }
      return getById<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, id);
    },

    getBySlotAndDate: async (slotId: string, date: string): Promise<AttendanceRecord[]> => {
      if (isApiMode()) {
        return attendanceApi.getBySlotAndDate(slotId, date) as Promise<AttendanceRecord[]>;
      }
      const records = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
      return records.filter(r => r.slotId === slotId && r.date === date);
    },

    getByMember: async (memberId: string): Promise<AttendanceRecord[]> => {
      if (isApiMode()) {
        return attendanceApi.getByMember(memberId) as Promise<AttendanceRecord[]>;
      }
      const records = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
      return records
        .filter(r => r.memberId === memberId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    getByMemberAndSlot: async (memberId: string, slotId: string): Promise<AttendanceRecord[]> => {
      if (isApiMode()) {
        return attendanceApi.getByMemberAndSlot(memberId, slotId) as Promise<AttendanceRecord[]>;
      }
      return attendanceService.getByMemberAndSlot(memberId, slotId);
    },

    getExistingRecord: async (memberId: string, slotId: string, date: string): Promise<AttendanceRecord | null> => {
      if (isApiMode()) {
        return attendanceApi.getExisting(memberId, slotId, date) as Promise<AttendanceRecord | null>;
      }
      return attendanceService.getExistingRecord(memberId, slotId, date);
    },

    markAttendance: async (
      memberId: string,
      slotId: string,
      date: string,
      status: AttendanceStatus,
      notes?: string
    ): Promise<AttendanceRecord> => {
      if (isApiMode()) {
        // API handles all business logic including counter updates
        return attendanceApi.markAttendance({
          memberId,
          slotId,
          date,
          status,
          notes,
        }) as Promise<AttendanceRecord>;
      }
      return attendanceService.markAttendance(memberId, slotId, date, status, notes);
    },

    getMemberSummaryForPeriod: async (
      memberId: string,
      slotId: string,
      periodStart: string,
      periodEnd: string
    ): Promise<{ presentDays: number; totalWorkingDays: number }> => {
      if (isApiMode()) {
        return attendanceApi.getMemberSummary(memberId, slotId, periodStart, periodEnd);
      }
      return attendanceService.getMemberSummaryForPeriod(memberId, slotId, periodStart, periodEnd);
    },

    isMarkedPresent: async (memberId: string, slotId: string, date: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await attendanceApi.isMarkedPresent(memberId, slotId, date);
        return result.isPresent;
      }
      return attendanceService.isMarkedPresent(memberId, slotId, date);
    },

    getSlotAttendanceWithMembers: async (
      slotId: string,
      date: string,
      periodStart: string,
      periodEnd: string
    ): Promise<Array<{
      member: Member;
      isPresent: boolean;
      presentDays: number;
      totalWorkingDays: number;
    }>> => {
      if (isApiMode()) {
        return attendanceApi.getSlotAttendanceWithMembers(slotId, date, periodStart, periodEnd) as Promise<Array<{
          member: Member;
          isPresent: boolean;
          presentDays: number;
          totalWorkingDays: number;
        }>>;
      }
      return attendanceService.getSlotAttendanceWithMembers(slotId, date, periodStart, periodEnd);
    },
  },
};
