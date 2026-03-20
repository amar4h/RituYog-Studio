/**
 * Session Planning Services
 * Asana, Session Plan, Allocation, Execution, and Analytics
 * Dual-mode: localStorage (default) or API
 */

import type {
  Asana,
  AsanaType,
  BodyArea,
  DifficultyLevel,
  SessionPlan,
  SessionPlanAllocation,
  SessionExecution,
  MembershipSubscription,
  AttendanceRecord,
} from '../../types';
import {
  STORAGE_KEYS,
  BODY_AREA_LABELS,
  MS_PER_DAY,
} from '../../constants';
import { getAll, getById, createDual, updateDual, removeDual } from './helpers';
import { memberService } from './memberService';
import { slotService } from './slotService';
import { settingsService } from './settingsService';
import { attendanceService } from './attendanceService';

// ============================================
// ASANA SERVICE (Session Planning)
// Dual-mode: localStorage (default) or API
// ============================================

export const asanaService = {
  // Synchronous CRUD methods
  getAll: () => getAll<Asana>(STORAGE_KEYS.ASANAS),
  getById: (id: string) => getById<Asana>(STORAGE_KEYS.ASANAS, id),
  create: (data: Omit<Asana, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Asana>(STORAGE_KEYS.ASANAS, data),
  update: (id: string, data: Partial<Asana>) =>
    updateDual<Asana>(STORAGE_KEYS.ASANAS, id, data),
  delete: (id: string) => removeDual<Asana>(STORAGE_KEYS.ASANAS, id),

  // Business logic queries
  getActive: (): Asana[] => {
    return getAll<Asana>(STORAGE_KEYS.ASANAS).filter(a => a.isActive);
  },

  getByType: (type: AsanaType): Asana[] => {
    return asanaService.getActive().filter(a => a.type === type);
  },

  getByDifficulty: (difficulty: DifficultyLevel): Asana[] => {
    return asanaService.getActive().filter(a => a.difficulty === difficulty);
  },

  getByBodyArea: (bodyArea: BodyArea): Asana[] => {
    return asanaService.getActive().filter(a =>
      a.primaryBodyAreas.includes(bodyArea) || a.secondaryBodyAreas.includes(bodyArea)
    );
  },

  search: (query: string): Asana[] => {
    const lower = query.toLowerCase();
    return asanaService.getActive().filter(a =>
      a.name.toLowerCase().includes(lower) ||
      (a.sanskritName && a.sanskritName.toLowerCase().includes(lower))
    );
  },

  // Filter with multiple criteria
  filter: (filters: {
    search?: string;
    type?: AsanaType;
    difficulty?: DifficultyLevel;
    bodyArea?: BodyArea;
  }): Asana[] => {
    let results = asanaService.getActive();

    if (filters.search) {
      const lower = filters.search.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(lower) ||
        (a.sanskritName && a.sanskritName.toLowerCase().includes(lower))
      );
    }

    if (filters.type) {
      results = results.filter(a => a.type === filters.type);
    }

    if (filters.difficulty) {
      results = results.filter(a => a.difficulty === filters.difficulty);
    }

    if (filters.bodyArea) {
      results = results.filter(a =>
        a.primaryBodyAreas.includes(filters.bodyArea!) ||
        a.secondaryBodyAreas.includes(filters.bodyArea!)
      );
    }

    return results;
  },

  // Vinyasa/Surya Namaskar helper methods
  // These sequence types contain child asanas

  // Check if asana is a sequence type (vinyasa or surya_namaskar)
  isSequenceType: (asana: Asana): boolean => {
    return asana.type === 'vinyasa' || asana.type === 'surya_namaskar';
  },

  // Get all non-sequence asanas (for vinyasa/surya_namaskar picker - prevent circular references)
  getNonVinyasaAsanas: (): Asana[] => {
    return asanaService.getActive().filter(a => a.type !== 'vinyasa' && a.type !== 'surya_namaskar');
  },

  // Get computed body areas for a sequence (aggregated from child asanas)
  getVinyasaBodyAreas: (asana: Asana): { primary: BodyArea[]; secondary: BodyArea[] } => {
    const isSequence = asana.type === 'vinyasa' || asana.type === 'surya_namaskar';
    if (!isSequence || !asana.childAsanas?.length) {
      return { primary: asana.primaryBodyAreas, secondary: asana.secondaryBodyAreas };
    }

    const primarySet = new Set<BodyArea>();
    const secondarySet = new Set<BodyArea>();

    for (const item of asana.childAsanas) {
      const childAsana = asanaService.getById(item.asanaId);
      if (childAsana) {
        childAsana.primaryBodyAreas.forEach(a => primarySet.add(a));
        childAsana.secondaryBodyAreas.forEach(a => secondarySet.add(a));
      }
    }

    // Primary areas override secondary (remove from secondary if in primary)
    secondarySet.forEach(a => {
      if (primarySet.has(a)) secondarySet.delete(a);
    });

    return {
      primary: Array.from(primarySet),
      secondary: Array.from(secondarySet),
    };
  },

  // Get computed benefits for a sequence (aggregated from child asanas)
  getVinyasaBenefits: (asana: Asana): string[] => {
    const isSequence = asana.type === 'vinyasa' || asana.type === 'surya_namaskar';
    if (!isSequence || !asana.childAsanas?.length) {
      return asana.benefits;
    }

    const benefitSet = new Set<string>();
    for (const item of asana.childAsanas) {
      const childAsana = asanaService.getById(item.asanaId);
      if (childAsana) {
        childAsana.benefits.forEach(b => benefitSet.add(b));
      }
    }
    return Array.from(benefitSet);
  },

  // Get sequence display string with child asanas separated by arrows
  getVinyasaDisplayString: (asana: Asana): string => {
    const isSequence = asana.type === 'vinyasa' || asana.type === 'surya_namaskar';
    if (!isSequence || !asana.childAsanas?.length) {
      return asana.name;
    }

    const childNames = asana.childAsanas
      .sort((a, b) => a.order - b.order)
      .map(child => asanaService.getById(child.asanaId)?.name || '?')
      .join(' → ');
    return `${asana.name}: ${childNames}`;
  },
};

// ============================================
// SESSION PLAN SERVICE (Session Planning)
// Dual-mode: localStorage (default) or API
// ============================================

export const sessionPlanService = {
  // Synchronous CRUD methods
  getAll: () => getAll<SessionPlan>(STORAGE_KEYS.SESSION_PLANS),
  getById: (id: string) => getById<SessionPlan>(STORAGE_KEYS.SESSION_PLANS, id),

  create: (data: Omit<SessionPlan, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'usageCount'>) => {
    const planData = {
      ...data,
      version: 1,
      usageCount: 0,
      isActive: data.isActive ?? true,
    };
    return createDual<SessionPlan>(STORAGE_KEYS.SESSION_PLANS, planData as Omit<SessionPlan, 'id' | 'createdAt' | 'updatedAt'>);
  },

  update: (id: string, data: Partial<SessionPlan>): SessionPlan | null => {
    const existing = sessionPlanService.getById(id);
    if (!existing) return null;

    // Increment version on any edit (for tracking, not FK integrity)
    // Snapshot approach means executions store full plan data
    return updateDual<SessionPlan>(STORAGE_KEYS.SESSION_PLANS, id, {
      ...data,
      version: existing.version + 1,
    });
  },

  delete: (id: string) => removeDual<SessionPlan>(STORAGE_KEYS.SESSION_PLANS, id),

  // Business logic queries
  getActive: (): SessionPlan[] => {
    return getAll<SessionPlan>(STORAGE_KEYS.SESSION_PLANS).filter(p => p.isActive);
  },

  getByLevel: (level: DifficultyLevel): SessionPlan[] => {
    return sessionPlanService.getActive().filter(p => p.level === level);
  },

  // For plan picker UI - show reuse intelligence
  getWithMetadata: () => {
    const plans = sessionPlanService.getActive();
    return plans.map(plan => ({
      ...plan,
      dominantBodyAreas: sessionPlanService.getDominantBodyAreas(plan),
      keyBenefits: sessionPlanService.getKeyBenefits(plan),
    }));
  },

  getDominantBodyAreas: (plan: SessionPlan): BodyArea[] => {
    const areaCount: Record<string, number> = {};
    for (const section of plan.sections) {
      for (const item of section.items) {
        const asana = asanaService.getById(item.asanaId);
        if (!asana) continue;
        for (const area of [...asana.primaryBodyAreas, ...asana.secondaryBodyAreas]) {
          areaCount[area] = (areaCount[area] || 0) + 1;
        }
      }
    }
    return Object.entries(areaCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area]) => area as BodyArea);
  },

  getKeyBenefits: (plan: SessionPlan): string[] => {
    const benefitCount: Record<string, number> = {};
    for (const section of plan.sections) {
      for (const item of section.items) {
        const asana = asanaService.getById(item.asanaId);
        if (!asana) continue;
        for (const benefit of asana.benefits) {
          benefitCount[benefit] = (benefitCount[benefit] || 0) + 1;
        }
      }
    }
    return Object.entries(benefitCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([benefit]) => benefit);
  },

  updateUsageStats: (id: string, date: string): void => {
    const plan = sessionPlanService.getById(id);
    if (!plan) return;

    // Check if already used on this date (across any slot)
    // Only increment usageCount once per day
    const existingExecutionsToday = sessionExecutionService.getByPlan(id)
      .filter(e => e.date === date);

    // If this is the first execution for this plan on this date, increment count
    // (The current execution hasn't been created yet, so length === 0 means this is the first)
    const shouldIncrementCount = existingExecutionsToday.length === 0;

    updateDual<SessionPlan>(STORAGE_KEYS.SESSION_PLANS, id, {
      usageCount: shouldIncrementCount ? plan.usageCount + 1 : plan.usageCount,
      lastUsedAt: new Date().toISOString(),
    });
  },

  // Clone a session plan
  clone: (id: string, newName?: string): SessionPlan => {
    const original = sessionPlanService.getById(id);
    if (!original) throw new Error('Session plan not found');

    const clonedData = {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      level: original.level,
      sections: JSON.parse(JSON.stringify(original.sections)), // Deep copy
      createdBy: original.createdBy,
      isActive: true,
    };
    return sessionPlanService.create(clonedData);
  },

  // Overuse Detection
  getOveruseWarning: (planId: string): { isOverused: boolean; reason?: string } => {
    const plan = sessionPlanService.getById(planId);
    if (!plan) return { isOverused: false };

    // Check if used in last 3 days
    if (plan.lastUsedAt) {
      const daysSinceUse = Math.floor(
        (Date.now() - new Date(plan.lastUsedAt).getTime()) / MS_PER_DAY
      );
      if (daysSinceUse <= 3) {
        return {
          isOverused: true,
          reason: `Used ${daysSinceUse === 0 ? 'today' : daysSinceUse + ' day' + (daysSinceUse > 1 ? 's' : '') + ' ago'}`,
        };
      }
    }

    // Check if used more than 5 unique days in last 30 days
    // (same plan used across multiple slots on same day counts as 1 usage)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentExecutions = sessionExecutionService.getByPlan(planId)
      .filter(e => new Date(e.date) >= thirtyDaysAgo);

    // Count unique days, not individual slot executions
    const uniqueDays = new Set(recentExecutions.map(e => e.date));
    const uniqueDayCount = uniqueDays.size;

    if (uniqueDayCount >= 5) {
      return {
        isOverused: true,
        reason: `Used on ${uniqueDayCount} days in last 30 days`,
      };
    }

    return { isOverused: false };
  },

  // Search plans
  search: (query: string): SessionPlan[] => {
    const lower = query.toLowerCase();
    return sessionPlanService.getActive().filter(p =>
      p.name.toLowerCase().includes(lower) ||
      (p.description && p.description.toLowerCase().includes(lower))
    );
  },
};

// ============================================
// SESSION PLAN ALLOCATION SERVICE (Session Planning)
// Dual-mode: localStorage (default) or API
// ============================================

export const sessionPlanAllocationService = {
  // Synchronous CRUD methods
  getAll: () => getAll<SessionPlanAllocation>(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS),
  getById: (id: string) => getById<SessionPlanAllocation>(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS, id),

  // Allocate plan to a specific slot+date
  allocate: (
    planId: string,
    slotId: string,
    date: string,
    allocatedBy?: string
  ): SessionPlanAllocation => {
    // Check for existing allocation
    const existing = sessionPlanAllocationService.getBySlotAndDate(slotId, date);
    if (existing && existing.status !== 'cancelled') {
      throw new Error('A plan is already allocated to this slot on this date');
    }

    return createDual<SessionPlanAllocation>(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS, {
      sessionPlanId: planId,
      slotId,
      date,
      allocatedBy,
      status: 'scheduled',
    });
  },

  // Bulk allocate same plan to ALL slots on a date
  allocateToAllSlots: (
    planId: string,
    date: string,
    allocatedBy?: string
  ): SessionPlanAllocation[] => {
    const slots = slotService.getActive();
    const allocations: SessionPlanAllocation[] = [];

    for (const slot of slots) {
      try {
        const allocation = sessionPlanAllocationService.allocate(planId, slot.id, date, allocatedBy);
        allocations.push(allocation);
      } catch {
        // Skip if already allocated
        console.warn(`Slot ${slot.id} already has allocation for ${date}`);
      }
    }
    return allocations;
  },

  getBySlotAndDate: (slotId: string, date: string): SessionPlanAllocation | null => {
    const allocations = sessionPlanAllocationService.getAll();
    return allocations.find(a =>
      a.slotId === slotId &&
      a.date === date &&
      a.status !== 'cancelled'
    ) || null;
  },

  getByDate: (date: string): SessionPlanAllocation[] => {
    return sessionPlanAllocationService.getAll()
      .filter(a => a.date === date && a.status !== 'cancelled');
  },

  getByDateRange: (startDate: string, endDate: string): SessionPlanAllocation[] => {
    return sessionPlanAllocationService.getAll()
      .filter(a => a.date >= startDate && a.date <= endDate && a.status !== 'cancelled');
  },

  cancel: (id: string): SessionPlanAllocation | null => {
    return updateDual<SessionPlanAllocation>(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS, id, {
      status: 'cancelled',
    });
  },

  markExecuted: (id: string, executionId: string): SessionPlanAllocation | null => {
    return updateDual<SessionPlanAllocation>(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS, id, {
      status: 'executed',
      executionId,
    });
  },

  delete: (id: string) => removeDual<SessionPlanAllocation>(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS, id),
};

// ============================================
// SESSION EXECUTION SERVICE (Session Planning)
// Dual-mode: localStorage (default) or API
// ============================================

export const sessionExecutionService = {
  // Synchronous CRUD methods
  getAll: () => getAll<SessionExecution>(STORAGE_KEYS.SESSION_EXECUTIONS),
  getById: (id: string) => getById<SessionExecution>(STORAGE_KEYS.SESSION_EXECUTIONS, id),

  // Check if execution already exists for slot+date
  getBySlotAndDate: (slotId: string, date: string): SessionExecution | null => {
    const executions = sessionExecutionService.getAll();
    return executions.find(e => e.slotId === slotId && e.date === date) || null;
  },

  // Create with snapshot + attendance integration
  create: (
    planId: string,
    slotId: string,
    date: string,
    instructor?: string,
    notes?: string
  ): SessionExecution => {
    const plan = sessionPlanService.getById(planId);
    if (!plan) throw new Error('Session plan not found');

    // DUPLICATE PREVENTION: Check if execution already exists
    const existing = sessionExecutionService.getBySlotAndDate(slotId, date);
    if (existing) {
      throw new Error(`Execution already recorded for this slot on ${date}`);
    }

    // ATTENDANCE INTEGRATION: Get members marked present for this slot+date
    const attendanceRecords = attendanceService.getBySlotAndDate(slotId, date);
    const presentMemberIds = attendanceRecords
      .filter(a => a.status === 'present')
      .map(a => a.memberId);

    const executionData: Omit<SessionExecution, 'id' | 'createdAt' | 'updatedAt'> = {
      sessionPlanId: planId,
      sessionPlanName: plan.name,  // Snapshot
      sessionPlanLevel: plan.level,  // Snapshot
      sectionsSnapshot: JSON.parse(JSON.stringify(plan.sections)),  // Deep copy snapshot
      slotId,
      date,
      instructor,
      notes,
      memberIds: presentMemberIds,  // Auto-linked from attendance
      attendeeCount: presentMemberIds.length,
    };

    // Update plan usage stats BEFORE creating execution (so the "already used today" check works)
    sessionPlanService.updateUsageStats(planId, date);

    const execution = createDual<SessionExecution>(STORAGE_KEYS.SESSION_EXECUTIONS, executionData);

    // Update allocation status if exists
    const allocation = sessionPlanAllocationService.getBySlotAndDate(slotId, date);
    if (allocation) {
      sessionPlanAllocationService.markExecuted(allocation.id, execution.id);
    }

    return execution;
  },

  // Executions are immutable - no update/delete in normal use

  getByDateRange: (startDate: string, endDate: string): SessionExecution[] => {
    return sessionExecutionService.getAll().filter(e =>
      e.date >= startDate && e.date <= endDate
    );
  },

  getBySlot: (slotId: string): SessionExecution[] => {
    return sessionExecutionService.getAll().filter(e => e.slotId === slotId);
  },

  getByPlan: (planId: string): SessionExecution[] => {
    return sessionExecutionService.getAll().filter(e => e.sessionPlanId === planId);
  },

  // Get member's session history (for member detail page)
  getByMember: (memberId: string): SessionExecution[] => {
    return sessionExecutionService.getAll()
      .filter(e => e.memberIds.includes(memberId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Get recent executions for dashboard/reports
  getRecent: (limit: number = 10): SessionExecution[] => {
    return sessionExecutionService.getAll()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  },

  /**
   * Auto-complete session executions for completed slots on a given date.
   * For each active offline slot whose end time has passed:
   *   - If an allocation exists but no execution has been recorded, auto-create the execution.
   * This ensures member portal reports have session data without manual recording.
   * Returns the number of executions auto-created.
   */
  autoCompleteExecutions: (date: string): number => {
    const slots = slotService.getActive();
    const now = new Date();
    const today = new Date().toISOString().split('T')[0];
    const isToday = date === today;

    // Don't process future dates
    if (date > today) return 0;

    // Find the latest offline slot end time — used as benchmark for online slots
    const latestOfflineEndMinutes = slots
      .filter(s => s.sessionType !== 'online')
      .reduce((max, s) => {
        const [h, m] = s.endTime.split(':').map(Number);
        return Math.max(max, h * 60 + m);
      }, 0);

    let created = 0;

    for (const slot of slots) {
      // For today, check if the session time is over
      if (isToday) {
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (slot.sessionType === 'online') {
          // Online slot completes when the last offline session ends
          if (nowMinutes < latestOfflineEndMinutes) continue;
        } else {
          const [endH, endM] = slot.endTime.split(':').map(Number);
          if (nowMinutes < endH * 60 + endM) continue;
        }
      }
      // For past dates, all slots are considered completed

      // Check if allocation exists but no execution recorded
      const allocation = sessionPlanAllocationService.getBySlotAndDate(slot.id, date);
      if (!allocation) continue; // No plan allocated for this slot+date

      const existing = sessionExecutionService.getBySlotAndDate(slot.id, date);
      if (existing) continue; // Already recorded

      // Auto-create execution from the allocated plan
      try {
        sessionExecutionService.create(allocation.sessionPlanId, slot.id, date);
        created++;
      } catch (err) {
        console.warn(`Auto-complete execution failed for ${slot.displayName} on ${date}:`, err);
      }
    }

    return created;
  },

  /**
   * Auto-complete executions for a date range (e.g., for member report periods).
   * Only processes weekdays (Mon-Fri) and extra working days since sessions don't run on regular weekends.
   */
  autoCompleteForDateRange: (startDate: string, endDate: string): number => {
    const today = new Date().toISOString().split('T')[0];
    const effectiveEnd = endDate > today ? today : endDate;
    const extraWorkingDays = settingsService.get()?.extraWorkingDays || [];
    let totalCreated = 0;

    // Iterate through each date in the range
    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(effectiveEnd + 'T00:00:00');

    while (current <= end) {
      const day = current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      // Weekdays (Mon=1 to Fri=5) or extra working days
      if ((day >= 1 && day <= 5) || extraWorkingDays.some(d => d.date === dateStr)) {
        totalCreated += sessionExecutionService.autoCompleteExecutions(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }

    return totalCreated;
  },
};

// ============================================
// SESSION ANALYTICS SERVICE (Session Planning)
// Computed from execution snapshots
// ============================================

export const sessionAnalyticsService = {
  // Helper to filter executions by slot
  _filterBySlot: (executions: SessionExecution[], slotId?: string) => {
    if (!slotId) return executions;
    return executions.filter(e => e.slotId === slotId);
  },

  // Asana Usage Report - uses snapshot data from executions
  getAsanaUsage: (startDate: string, endDate: string, slotId?: string) => {
    const allExecutions = sessionExecutionService.getByDateRange(startDate, endDate);
    const executions = sessionAnalyticsService._filterBySlot(allExecutions, slotId);
    const asanaStats: Record<string, { count: number; totalDuration: number }> = {};

    for (const execution of executions) {
      // Use sectionsSnapshot from execution (not current plan state)
      for (const section of execution.sectionsSnapshot) {
        for (const item of section.items) {
          if (!asanaStats[item.asanaId]) {
            asanaStats[item.asanaId] = { count: 0, totalDuration: 0 };
          }
          asanaStats[item.asanaId].count++;
          asanaStats[item.asanaId].totalDuration += item.durationMinutes || 0;
        }
      }
    }

    // Look up current asana names for display
    return Object.entries(asanaStats).map(([asanaId, stats]) => {
      const asana = asanaService.getById(asanaId);
      return {
        asanaId,
        asanaName: asana?.name || 'Unknown/Deleted',
        sanskritName: asana?.sanskritName,
        type: asana?.type,
        timesUsed: stats.count,
        totalDuration: stats.totalDuration,
        avgDuration: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0,
      };
    }).sort((a, b) => b.timesUsed - a.timesUsed);
  },

  // Body Area Focus Report
  getBodyAreaFocus: (startDate: string, endDate: string, slotId?: string) => {
    const allExecutions = sessionExecutionService.getByDateRange(startDate, endDate);
    const executions = sessionAnalyticsService._filterBySlot(allExecutions, slotId);
    const areaStats: Record<BodyArea, { primary: number; secondary: number }> = {} as Record<BodyArea, { primary: number; secondary: number }>;

    // Initialize all areas
    const bodyAreas: BodyArea[] = ['spine', 'shoulders', 'hips', 'knees', 'hamstrings', 'calves', 'ankles', 'core', 'neck', 'respiratory', 'nervous_system'];
    for (const area of bodyAreas) {
      areaStats[area] = { primary: 0, secondary: 0 };
    }

    for (const execution of executions) {
      for (const section of execution.sectionsSnapshot) {
        for (const item of section.items) {
          const asana = asanaService.getById(item.asanaId);
          if (!asana) continue;

          for (const area of asana.primaryBodyAreas) {
            if (areaStats[area]) {
              areaStats[area].primary++;
            }
          }
          for (const area of asana.secondaryBodyAreas) {
            if (areaStats[area]) {
              areaStats[area].secondary++;
            }
          }
        }
      }
    }

    const total = Object.values(areaStats).reduce(
      (sum, s) => sum + s.primary + s.secondary, 0
    );

    return Object.entries(areaStats).map(([area, stats]) => ({
      area: area as BodyArea,
      primaryCount: stats.primary,
      secondaryCount: stats.secondary,
      totalCount: stats.primary + stats.secondary,
      percentage: total > 0 ? Math.round(((stats.primary + stats.secondary) / total) * 100) : 0,
    })).sort((a, b) => b.totalCount - a.totalCount);
  },

  // Benefit Coverage Report
  getBenefitCoverage: (startDate: string, endDate: string, slotId?: string) => {
    const allExecutions = sessionExecutionService.getByDateRange(startDate, endDate);
    const executions = sessionAnalyticsService._filterBySlot(allExecutions, slotId);
    const benefitCounts: Record<string, number> = {};

    for (const execution of executions) {
      for (const section of execution.sectionsSnapshot) {
        for (const item of section.items) {
          const asana = asanaService.getById(item.asanaId);
          if (!asana) continue;

          for (const benefit of asana.benefits) {
            benefitCounts[benefit] = (benefitCounts[benefit] || 0) + 1;
          }
        }
      }
    }

    return Object.entries(benefitCounts)
      .map(([benefit, count]) => ({ benefit, sessionCount: count }))
      .sort((a, b) => b.sessionCount - a.sessionCount);
  },

  // Session Plan Effectiveness Report (can also filter by slot usage)
  getPlanEffectiveness: (slotId?: string) => {
    const plans = sessionPlanService.getActive();
    const executions = sessionExecutionService.getAll();
    const filteredExecutions = sessionAnalyticsService._filterBySlot(executions, slotId);

    // Build usage stats from filtered executions
    const planUsage: Record<string, { count: number; lastUsed: string | null }> = {};
    for (const e of filteredExecutions) {
      if (!planUsage[e.sessionPlanId]) {
        planUsage[e.sessionPlanId] = { count: 0, lastUsed: null };
      }
      planUsage[e.sessionPlanId].count++;
      if (!planUsage[e.sessionPlanId].lastUsed || e.date > planUsage[e.sessionPlanId].lastUsed!) {
        planUsage[e.sessionPlanId].lastUsed = e.date;
      }
    }

    return plans.map(plan => {
      const usage = planUsage[plan.id] || { count: 0, lastUsed: null };
      return {
        planId: plan.id,
        planName: plan.name,
        level: plan.level,
        usageCount: slotId ? usage.count : plan.usageCount, // Use filtered count if slot selected
        lastUsedAt: slotId ? usage.lastUsed : plan.lastUsedAt,
        daysSinceLastUse: (slotId ? usage.lastUsed : plan.lastUsedAt)
          ? Math.floor((Date.now() - new Date((slotId ? usage.lastUsed : plan.lastUsedAt)!).getTime()) / MS_PER_DAY)
          : null,
        dominantBodyAreas: sessionPlanService.getDominantBodyAreas(plan),
        keyBenefits: sessionPlanService.getKeyBenefits(plan),
      };
    }).sort((a, b) => b.usageCount - a.usageCount);
  },

  // Summary stats for dashboard
  getSummary: (startDate: string, endDate: string, slotId?: string) => {
    const allExecutions = sessionExecutionService.getByDateRange(startDate, endDate);
    const executions = sessionAnalyticsService._filterBySlot(allExecutions, slotId);
    const uniquePlans = new Set(executions.map(e => e.sessionPlanId));
    const totalAttendees = executions.reduce((sum, e) => sum + e.attendeeCount, 0);

    return {
      totalSessions: executions.length,
      uniquePlansUsed: uniquePlans.size,
      totalAttendees,
      avgAttendeesPerSession: executions.length > 0
        ? Math.round(totalAttendees / executions.length)
        : 0,
    };
  },

  // ============================================
  // MEMBER & BATCH REPORT DATA AGGREGATION
  // ============================================

  /** Get members who had subscriptions in a slot during a period (for dropdown) */
  getSlotMembersForPeriod: (slotId: string, startDate: string, endDate: string): Array<{ memberId: string; memberName: string }> => {
    const subs = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
    const memberIds = new Set<string>();
    for (const sub of subs) {
      if (sub.slotId === slotId && sub.startDate <= endDate && sub.endDate >= startDate) {
        memberIds.add(sub.memberId);
      }
    }
    return Array.from(memberIds).map(id => {
      const m = memberService.getById(id);
      return { memberId: id, memberName: m ? `${m.firstName} ${m.lastName}` : 'Unknown' };
    }).sort((a, b) => a.memberName.localeCompare(b.memberName));
  },

  /** Aggregate asanas/bodyAreas/benefits from a set of executions */
  _aggregateFromExecutions: (executions: SessionExecution[]) => {
    const asanaStats: Record<string, { count: number }> = {};
    const areaCounts: Record<string, number> = {};
    const benefitCounts: Record<string, number> = {};

    // Helper to tally one asana and its body areas / benefits
    const tallyAsana = (asanaId: string) => {
      if (!asanaStats[asanaId]) {
        asanaStats[asanaId] = { count: 0 };
      }
      asanaStats[asanaId].count++;

      const asana = asanaService.getById(asanaId);
      if (asana) {
        for (const area of [...asana.primaryBodyAreas, ...asana.secondaryBodyAreas]) {
          areaCounts[area] = (areaCounts[area] || 0) + 1;
        }
        for (const benefit of asana.benefits) {
          benefitCounts[benefit] = (benefitCounts[benefit] || 0) + 1;
        }
      }
    };

    for (const exec of executions) {
      for (const section of exec.sectionsSnapshot) {
        for (const item of section.items) {
          const asana = asanaService.getById(item.asanaId);

          if (asana?.type === 'surya_namaskar') {
            // Surya Namaskar: count as ONE (the parent), ignore child asanas
            tallyAsana(item.asanaId);
          } else if (asana?.type === 'vinyasa' && asana.childAsanas && asana.childAsanas.length > 0) {
            // Vinyasa: expand and count each child asana individually
            for (const child of asana.childAsanas) {
              tallyAsana(child.asanaId);
            }
          } else {
            // Regular asana / pranayama / kriya / etc.
            tallyAsana(item.asanaId);
          }
        }
      }
    }

    // Resolve display names (short names for surya_namaskar)
    const topAsanas = Object.entries(asanaStats).map(([asanaId, stats]) => {
      const asana = asanaService.getById(asanaId);
      let name = asana?.name || 'Unknown';
      if (asana?.type === 'surya_namaskar' && name.includes(' - ')) {
        name = name.split(' - ').slice(1).join(' - ');
      }
      return { name, count: stats.count };
    }).sort((a, b) => b.count - a.count);

    const totalAreaMentions = Object.values(areaCounts).reduce((s, c) => s + c, 0);
    const bodyAreas = Object.entries(areaCounts)
      .map(([area, count]) => ({
        area,
        label: (BODY_AREA_LABELS as Record<string, string>)[area] || area,
        percentage: totalAreaMentions > 0 ? Math.round((count / totalAreaMentions) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const topBenefits = Object.entries(benefitCounts)
      .map(([benefit, count]) => ({ benefit, count }))
      .sort((a, b) => b.count - a.count);

    return { topAsanas, bodyAreas, topBenefits, uniqueAsanasCount: topAsanas.length };
  },

  /** Per-member report data */
  getMemberSessionReport: (memberId: string, slotId: string, startDate: string, endDate: string) => {
    // Cap endDate at today for current periods (don't count future days)
    const today = new Date().toISOString().split('T')[0];
    const effectiveEnd = endDate > today ? today : endDate;

    const allExecs = sessionExecutionService.getByDateRange(startDate, effectiveEnd)
      .filter(e => e.slotId === slotId);

    // Build set of dates the member was present (across all slots, matching
    // how getMemberSummaryForPeriod counts presentDays — it ignores slotId).
    const allAttendance = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
    const presentDates = new Set(
      allAttendance
        .filter(r =>
          r.memberId === memberId &&
          r.date >= startDate &&
          r.date <= effectiveEnd &&
          r.status === 'present'
        )
        .map(r => r.date)
    );

    // Split executions into attended / missed using the same present-dates set
    const attended = allExecs.filter(e => presentDates.has(e.date));
    const missed = allExecs.filter(e => !presentDates.has(e.date));

    const attendedAgg = sessionAnalyticsService._aggregateFromExecutions(attended);
    let missedAgg = sessionAnalyticsService._aggregateFromExecutions(missed);

    // Fallback: if no missed executions but member missed days, check allocations.
    // The day they missed may not have an execution record yet, but the plan
    // was allocated. Use the allocated plan's sections as a proxy.
    if (missedAgg.topAsanas.length === 0) {
      const execDates = new Set(allExecs.map(e => e.date));
      // Find working dates the member was absent AND have no execution
      const allAllocations = sessionPlanAllocationService.getByDateRange(startDate, effectiveEnd)
        .filter(a => a.slotId === slotId);
      const missedFromAllocations: SessionExecution[] = [];
      for (const alloc of allAllocations) {
        if (!presentDates.has(alloc.date) && !execDates.has(alloc.date)) {
          // No execution for this date, but a plan was allocated — use plan sections
          const plan = sessionPlanService.getById(alloc.sessionPlanId);
          if (plan) {
            missedFromAllocations.push({
              id: alloc.id,
              sessionPlanId: plan.id,
              sessionPlanName: plan.name,
              sessionPlanLevel: plan.level,
              slotId: alloc.slotId,
              date: alloc.date,
              sectionsSnapshot: plan.sections,
              memberIds: [],
              attendeeCount: 0,
              createdAt: alloc.createdAt,
              updatedAt: alloc.updatedAt,
            } as SessionExecution);
          }
        }
      }
      if (missedFromAllocations.length > 0) {
        missedAgg = sessionAnalyticsService._aggregateFromExecutions(missedFromAllocations);
      }
    }

    // Attendance — cap at today so future working days aren't counted
    const summary = attendanceService.getMemberSummaryForPeriod(memberId, slotId, startDate, effectiveEnd);

    // Member info
    const member = memberService.getById(memberId);
    const memberName = member ? `${member.firstName} ${member.lastName}` : 'Unknown';

    // Slot info
    const slot = slotService.getById(slotId);
    const slotDisplayName = slot?.displayName || slotId;

    // Studio branding
    const settings = settingsService.getOrDefault();

    return {
      memberName,
      slotDisplayName,
      sessionsAttended: summary.presentDays,
      totalWorkingDays: summary.totalWorkingDays,
      attendanceRate: summary.totalWorkingDays > 0
        ? Math.round((summary.presentDays / summary.totalWorkingDays) * 100)
        : 0,
      uniqueAsanasCount: attendedAgg.uniqueAsanasCount,
      topAsanas: attendedAgg.topAsanas.slice(0, 8),
      bodyAreas: attendedAgg.bodyAreas.slice(0, 8),
      topBenefits: attendedAgg.topBenefits.slice(0, 6),
      missedSessions: Math.max(0, summary.totalWorkingDays - summary.presentDays),
      missedAsanas: missedAgg.topAsanas.slice(0, 8),
      missedBodyAreas: missedAgg.bodyAreas.slice(0, 5),
      missedBenefits: missedAgg.topBenefits.slice(0, 4),
      studioName: settings.studioName || 'Yoga Studio',
      logoData: settings.logoData,
    };
  },

  /** Per-batch report data */
  getBatchSessionReport: (slotId: string, startDate: string, endDate: string) => {
    // Cap endDate at today for current periods
    const today = new Date().toISOString().split('T')[0];
    const effectiveEnd = endDate > today ? today : endDate;

    const execs = sessionExecutionService.getByDateRange(startDate, effectiveEnd)
      .filter(e => e.slotId === slotId);

    const agg = sessionAnalyticsService._aggregateFromExecutions(execs);
    // Compute attendance from live records (not snapshot — attendance may be updated after execution is recorded)
    let totalAttendees = 0;
    for (const e of execs) {
      const records = attendanceService.getBySlotAndDate(e.slotId, e.date);
      const presentCount = records.filter(r => r.status === 'present').length;
      totalAttendees += presentCount;
    }
    const totalBenefits = new Set(agg.topBenefits.map(b => b.benefit)).size;

    // Slot info
    const slot = slotService.getById(slotId);
    const slotDisplayName = slot?.displayName || slotId;

    // Studio branding
    const settings = settingsService.getOrDefault();

    return {
      slotDisplayName,
      totalSessions: execs.length,
      uniqueAsanasCount: agg.uniqueAsanasCount,
      totalBenefits,
      avgAttendees: execs.length > 0 ? Math.round(totalAttendees / execs.length) : 0,
      topAsanas: agg.topAsanas.slice(0, 10),
      bodyAreas: agg.bodyAreas,
      topBenefits: agg.topBenefits.slice(0, 8),
      studioName: settings.studioName || 'Yoga Studio',
      logoData: settings.logoData,
    };
  },
};
