# Yoga Session Planning, Execution & Analytics - Implementation Plan

## Overview

This plan implements a structured system for:
- Defining reusable yoga session plans (templates)
- **Pre-allocating** plans to slots/dates (scheduling)
- Tracking execution history with **attendance integration**
- Generating analytics on asanas, body areas, and benefits
- **Overuse warnings** to avoid repetitive sessions

### Key Enhancements (Beyond Original Spec)
1. **Session Allocation** - Pre-schedule plans to slots, with bulk-assign to all slots on a day
2. **Duplicate Execution Prevention** - One execution per slot per date
3. **Plan Description Field** - General notes/guidance for each plan
4. **Explicit Order in SectionItem** - Robust drag-and-drop ordering
5. **Overuse Warning** - Warn when plan used recently or consecutively
6. **Session Plan Clone** - Duplicate plans for variations
7. **Attendance Integration** - Auto-link members present to session execution

---

## 1. Data Model (Types)

### Update: `src/types/index.ts` (add to existing file)

```typescript
// === BODY AREAS (Controlled Vocabulary) ===
export const BODY_AREAS = [
  'spine', 'shoulders', 'hips', 'knees', 'hamstrings',
  'calves', 'ankles', 'core', 'neck', 'respiratory', 'nervous_system'
] as const;
export type BodyArea = typeof BODY_AREAS[number];

// === ASANA TYPES ===
export const ASANA_TYPES = ['asana', 'pranayama', 'kriya', 'exercise', 'relaxation'] as const;
export type AsanaType = typeof ASANA_TYPES[number];

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

// === SECTION TYPES (Fixed 5 sections) ===
export const SECTION_TYPES = [
  'WARM_UP',
  'SURYA_NAMASKARA',
  'ASANA_SEQUENCE',
  'PRANAYAMA',
  'SHAVASANA'
] as const;
export type SectionType = typeof SECTION_TYPES[number];

export const SECTION_ORDER: Record<SectionType, number> = {
  WARM_UP: 1,
  SURYA_NAMASKARA: 2,
  ASANA_SEQUENCE: 3,
  PRANAYAMA: 4,
  SHAVASANA: 5
};

export const SECTION_LABELS: Record<SectionType, string> = {
  WARM_UP: 'Warm Up',
  SURYA_NAMASKARA: 'Surya Namaskara',
  ASANA_SEQUENCE: 'Main Asana Sequence',
  PRANAYAMA: 'Pranayama',
  SHAVASANA: 'Shavasana'
};

// === INTENSITY ===
export const INTENSITY_LEVELS = ['low', 'medium', 'high'] as const;
export type IntensityLevel = typeof INTENSITY_LEVELS[number];

// === ASANA (Master Data) ===
export interface Asana extends BaseEntity {
  name: string;
  sanskritName?: string;
  type: AsanaType;
  primaryBodyAreas: BodyArea[];
  secondaryBodyAreas: BodyArea[];
  benefits: string[];  // Structured list, NOT paragraph
  difficulty: DifficultyLevel;
  contraindications?: string[];
  isActive: boolean;
}

// === SECTION ITEM (Asana in a section) ===
export interface SectionItem {
  asanaId: string;
  order: number;  // Explicit order for drag-and-drop (1-based)
  variation?: string;
  durationMinutes?: number;
  reps?: number;
  intensity: IntensityLevel;
  notes?: string;
}

// === SESSION PLAN SECTION ===
export interface SessionPlanSection {
  sectionType: SectionType;
  order: number;  // 1-5
  items: SectionItem[];
}

// === SESSION PLAN (Template) ===
export interface SessionPlan extends BaseEntity {
  name: string;
  description?: string;  // General notes/guidance (e.g., "Good for monsoon", "Stress relief focus")
  level: DifficultyLevel;
  version: number;
  sections: SessionPlanSection[];
  createdBy?: string;
  lastUsedAt?: string;
  usageCount: number;
  isActive: boolean;
}

// === SESSION PLAN ALLOCATION (Pre-scheduling) ===
// Allocate a plan to a slot+date BEFORE the class happens
export interface SessionPlanAllocation extends BaseEntity {
  sessionPlanId: string;
  slotId: string;
  date: string;  // YYYY-MM-DD
  allocatedBy?: string;
  status: 'scheduled' | 'executed' | 'cancelled';
  executionId?: string;  // Links to SessionExecution once conducted
}

// === SESSION EXECUTION (Immutable History) ===
// Uses SNAPSHOT approach - stores plan data at execution time
// (matches Invoice.items pattern - stores what was actually practiced)
export interface SessionExecution extends BaseEntity {
  sessionPlanId: string;
  sessionPlanName: string;  // Snapshot
  sessionPlanLevel: DifficultyLevel;  // Snapshot
  sectionsSnapshot: SessionPlanSection[];  // Full snapshot of sections at execution time
  slotId: string;
  date: string;  // YYYY-MM-DD
  instructor?: string;
  notes?: string;
  // Attendance Integration - members present for this session
  memberIds: string[];  // Auto-populated from attendance records on execution
  attendeeCount: number;  // Cached count for quick display
}

// === FILTER TYPES ===
export interface AsanaFilters {
  search?: string;
  type?: AsanaType;
  difficulty?: DifficultyLevel;
  bodyArea?: BodyArea;
}

export interface SessionPlanFilters {
  search?: string;
  level?: DifficultyLevel;
  lastUsedAfter?: string;
}
```

---

## 2. Storage Keys & Constants

### Update: `src/constants/index.ts`

Add new storage keys:
```typescript
export const STORAGE_KEYS = {
  // ... existing keys
  ASANAS: 'yoga_studio_asanas',
  SESSION_PLANS: 'yoga_studio_session_plans',
  SESSION_PLAN_ALLOCATIONS: 'yoga_studio_session_plan_allocations',
  SESSION_EXECUTIONS: 'yoga_studio_session_executions',
};
```

Add body area labels for display:
```typescript
export const BODY_AREA_LABELS: Record<BodyArea, string> = {
  spine: 'Spine',
  shoulders: 'Shoulders',
  hips: 'Hips',
  knees: 'Knees',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  ankles: 'Ankles',
  core: 'Core',
  neck: 'Neck',
  respiratory: 'Respiratory System',
  nervous_system: 'Nervous System'
};
```

---

## 3. Service Layer

### Update: `src/services/storage.ts`

#### 3.1 Asana Service
```typescript
export const asanaService = {
  // Sync methods (dual-mode: localStorage + API queue)
  getAll: () => getAll<Asana>(STORAGE_KEYS.ASANAS),
  getById: (id: string) => getById<Asana>(STORAGE_KEYS.ASANAS, id),
  create: (data) => createDual<Asana>(STORAGE_KEYS.ASANAS, data),
  update: (id, data) => updateDual<Asana>(STORAGE_KEYS.ASANAS, id, data),
  delete: (id) => removeDual<Asana>(STORAGE_KEYS.ASANAS, id),

  // Business logic queries
  getActive: () => asanaService.getAll().filter(a => a.isActive),
  getByType: (type: AsanaType) => asanaService.getActive().filter(a => a.type === type),
  search: (query: string) => {
    const lower = query.toLowerCase();
    return asanaService.getActive().filter(a =>
      a.name.toLowerCase().includes(lower) ||
      a.sanskritName?.toLowerCase().includes(lower)
    );
  },

  // Async methods for API mode (follows existing memberService pattern)
  async: {
    getAll: async (): Promise<Asana[]> => {
      if (isApiMode()) {
        return asanasApi.getAll() as Promise<Asana[]>;
      }
      return getAll<Asana>(STORAGE_KEYS.ASANAS);
    },
    getById: async (id: string): Promise<Asana | null> => {
      if (isApiMode()) {
        return asanasApi.getById(id) as Promise<Asana | null>;
      }
      return getById<Asana>(STORAGE_KEYS.ASANAS, id);
    },
    create: async (data): Promise<Asana> => {
      if (isApiMode()) {
        const result = await asanasApi.create(data);
        return result as Asana;
      }
      return createDual<Asana>(STORAGE_KEYS.ASANAS, data);
    },
    // ... update, delete follow same pattern
  },
};
```

#### 3.2 Session Plan Service
```typescript
export const sessionPlanService = {
  // Sync methods
  getAll: () => getAll<SessionPlan>(STORAGE_KEYS.SESSION_PLANS),
  getById: (id: string) => getById<SessionPlan>(STORAGE_KEYS.SESSION_PLANS, id),

  create: (data) => {
    const planData = { ...data, version: 1, usageCount: 0, isActive: true };
    return createDual<SessionPlan>(STORAGE_KEYS.SESSION_PLANS, planData);
  },

  update: (id: string, data: Partial<SessionPlan>) => {
    const existing = sessionPlanService.getById(id);
    if (!existing) throw new Error('Session plan not found');
    // Increment version on any edit (for tracking, not FK integrity)
    // Snapshot approach means executions store full plan data
    return updateDual<SessionPlan>(STORAGE_KEYS.SESSION_PLANS, id, {
      ...data,
      version: existing.version + 1,
    });
  },

  delete: (id: string) => removeDual<SessionPlan>(STORAGE_KEYS.SESSION_PLANS, id),

  getActive: () => sessionPlanService.getAll().filter(p => p.isActive),

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

  updateUsageStats: (id: string) => {
    const plan = sessionPlanService.getById(id);
    if (!plan) return;
    updateDual<SessionPlan>(STORAGE_KEYS.SESSION_PLANS, id, {
      usageCount: plan.usageCount + 1,
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
      // Reset usage stats for clone
      usageCount: 0,
      lastUsedAt: undefined,
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
        (Date.now() - new Date(plan.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUse <= 3) {
        return { isOverused: true, reason: `Used ${daysSinceUse === 0 ? 'today' : daysSinceUse + ' days ago'}` };
      }
    }

    // Check if used more than 5 times in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentExecutions = sessionExecutionService.getByPlan(planId)
      .filter(e => new Date(e.date) >= thirtyDaysAgo);

    if (recentExecutions.length >= 5) {
      return { isOverused: true, reason: `Used ${recentExecutions.length} times in last 30 days` };
    }

    return { isOverused: false };
  },
};
```

#### 3.2.1 Session Plan Allocation Service (NEW)
```typescript
export const sessionPlanAllocationService = {
  getAll: () => getAll<SessionPlanAllocation>(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS),
  getById: (id: string) => getById<SessionPlanAllocation>(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS, id),

  // Allocate plan to a specific slot+date
  allocate: (planId: string, slotId: string, date: string, allocatedBy?: string): SessionPlanAllocation => {
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
  allocateToAllSlots: (planId: string, date: string, allocatedBy?: string): SessionPlanAllocation[] => {
    const slots = slotService.getActive();
    const allocations: SessionPlanAllocation[] = [];

    for (const slot of slots) {
      try {
        const allocation = sessionPlanAllocationService.allocate(planId, slot.id, date, allocatedBy);
        allocations.push(allocation);
      } catch (e) {
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

  cancel: (id: string) => {
    return updateDual<SessionPlanAllocation>(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS, id, {
      status: 'cancelled',
    });
  },

  markExecuted: (id: string, executionId: string) => {
    return updateDual<SessionPlanAllocation>(STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS, id, {
      status: 'executed',
      executionId,
    });
  },
};

#### 3.3 Session Execution Service
```typescript
export const sessionExecutionService = {
  getAll: () => getAll<SessionExecution>(STORAGE_KEYS.SESSION_EXECUTIONS),
  getById: (id: string) => getById<SessionExecution>(STORAGE_KEYS.SESSION_EXECUTIONS, id),

  // Check if execution already exists for slot+date
  getBySlotAndDate: (slotId: string, date: string): SessionExecution | null => {
    const executions = sessionExecutionService.getAll();
    return executions.find(e => e.slotId === slotId && e.date === date) || null;
  },

  // Create with snapshot + attendance integration
  create: (planId: string, slotId: string, date: string, instructor?: string, notes?: string) => {
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

    const executionData = {
      sessionPlanId: planId,
      sessionPlanName: plan.name,  // Snapshot
      sessionPlanLevel: plan.level,  // Snapshot
      sectionsSnapshot: plan.sections,  // Full snapshot
      slotId,
      date,
      instructor,
      notes,
      memberIds: presentMemberIds,  // Auto-linked from attendance
      attendeeCount: presentMemberIds.length,
    };

    const execution = createDual<SessionExecution>(STORAGE_KEYS.SESSION_EXECUTIONS, executionData);

    // Update plan usage stats
    sessionPlanService.updateUsageStats(planId);

    // Update allocation status if exists
    const allocation = sessionPlanAllocationService.getBySlotAndDate(slotId, date);
    if (allocation) {
      sessionPlanAllocationService.markExecuted(allocation.id, execution.id);
    }

    return execution;
  },

  // Executions are immutable - no update/delete

  getByDateRange: (startDate: string, endDate: string) => {
    return sessionExecutionService.getAll().filter(e =>
      e.date >= startDate && e.date <= endDate
    );
  },

  getBySlot: (slotId: string) => {
    return sessionExecutionService.getAll().filter(e => e.slotId === slotId);
  },

  getByPlan: (planId: string) => {
    return sessionExecutionService.getAll().filter(e => e.sessionPlanId === planId);
  },

  // Get member's session history (for member detail page)
  getByMember: (memberId: string): SessionExecution[] => {
    return sessionExecutionService.getAll()
      .filter(e => e.memberIds.includes(memberId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Async methods
  async: {
    getAll: async (): Promise<SessionExecution[]> => {
      if (isApiMode()) {
        return sessionExecutionsApi.getAll() as Promise<SessionExecution[]>;
      }
      return getAll<SessionExecution>(STORAGE_KEYS.SESSION_EXECUTIONS);
    },
    create: async (planId: string, slotId: string, date: string, instructor?: string, notes?: string): Promise<SessionExecution> => {
      // Same logic with async calls
      if (isApiMode()) {
        // Check duplicate
        const existing = await sessionExecutionService.async.getBySlotAndDate(slotId, date);
        if (existing) throw new Error(`Execution already recorded for this slot on ${date}`);

        const plan = await sessionPlanService.async.getById(planId);
        if (!plan) throw new Error('Session plan not found');

        // Get attendance
        const attendanceRecords = await attendanceService.async.getBySlotAndDate(slotId, date);
        const presentMemberIds = attendanceRecords.filter(a => a.status === 'present').map(a => a.memberId);

        const data = {
          sessionPlanId: planId,
          sessionPlanName: plan.name,
          sessionPlanLevel: plan.level,
          sectionsSnapshot: plan.sections,
          slotId,
          date,
          instructor,
          notes,
          memberIds: presentMemberIds,
          attendeeCount: presentMemberIds.length,
        };

        const result = await sessionExecutionsApi.create(data);
        await sessionPlanService.async.updateUsageStats(planId);
        return result as SessionExecution;
      }
      return sessionExecutionService.create(planId, slotId, date, instructor, notes);
    },
  },
};
```

#### 3.4 Analytics Service (Computed from Execution Snapshots)
```typescript
export const sessionAnalyticsService = {
  // Asana Usage Report - uses snapshot data from executions
  getAsanaUsage: (startDate: string, endDate: string) => {
    const executions = sessionExecutionService.getByDateRange(startDate, endDate);
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
        timesUsed: stats.count,
        avgDuration: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0,
      };
    }).sort((a, b) => b.timesUsed - a.timesUsed);
  },

  // Body Area Focus Report
  getBodyAreaFocus: (startDate: string, endDate: string) => {
    const executions = sessionExecutionService.getByDateRange(startDate, endDate);
    const areaStats: Record<BodyArea, { primary: number; secondary: number }> = {} as any;

    for (const area of BODY_AREAS) {
      areaStats[area] = { primary: 0, secondary: 0 };
    }

    for (const execution of executions) {
      for (const section of execution.sectionsSnapshot) {
        for (const item of section.items) {
          const asana = asanaService.getById(item.asanaId);
          if (!asana) continue;

          for (const area of asana.primaryBodyAreas) {
            areaStats[area].primary++;
          }
          for (const area of asana.secondaryBodyAreas) {
            areaStats[area].secondary++;
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
  getBenefitCoverage: (startDate: string, endDate: string) => {
    const executions = sessionExecutionService.getByDateRange(startDate, endDate);
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

  // Session Plan Effectiveness Report
  getPlanEffectiveness: () => {
    const plans = sessionPlanService.getActive();
    return plans.map(plan => ({
      planId: plan.id,
      planName: plan.name,
      level: plan.level,
      usageCount: plan.usageCount,
      lastUsedAt: plan.lastUsedAt,
      daysSinceLastUse: plan.lastUsedAt
        ? Math.floor((Date.now() - new Date(plan.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      dominantBodyAreas: sessionPlanService.getDominantBodyAreas(plan),
      keyBenefits: sessionPlanService.getKeyBenefits(plan),
    })).sort((a, b) => b.usageCount - a.usageCount);
  },
};
```

---

## 4. API Endpoints (for MySQL)

### New Files in `api/endpoints/`

| File | Class | Table |
|------|-------|-------|
| `asanas.php` | `AsanasHandler` | `asanas` |
| `session-plans.php` | `SessionPlansHandler` | `session_plans` |
| `session-plan-allocations.php` | `SessionPlanAllocationsHandler` | `session_plan_allocations` |
| `session-executions.php` | `SessionExecutionsHandler` | `session_executions` |

### Database Schema

```sql
-- Asanas (Master Data)
CREATE TABLE asanas (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sanskrit_name VARCHAR(255),
  type ENUM('asana', 'pranayama', 'kriya', 'exercise', 'relaxation') NOT NULL,
  primary_body_areas JSON NOT NULL CHECK (JSON_VALID(primary_body_areas)),
  secondary_body_areas JSON NOT NULL CHECK (JSON_VALID(secondary_body_areas)),
  benefits JSON NOT NULL CHECK (JSON_VALID(benefits)),
  difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
  contraindications JSON CHECK (JSON_VALID(contraindications)),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_difficulty (difficulty),
  INDEX idx_active (is_active)
);

-- Session Plans (Templates)
CREATE TABLE session_plans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,  -- General notes/guidance
  level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
  version INT NOT NULL DEFAULT 1,
  sections JSON NOT NULL CHECK (JSON_VALID(sections)),
  created_by VARCHAR(255),
  last_used_at TIMESTAMP,
  usage_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_level (level),
  INDEX idx_active (is_active)
);

-- Session Plan Allocations (Pre-scheduling)
CREATE TABLE session_plan_allocations (
  id VARCHAR(36) PRIMARY KEY,
  session_plan_id VARCHAR(36) NOT NULL,
  slot_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  allocated_by VARCHAR(255),
  status ENUM('scheduled', 'executed', 'cancelled') DEFAULT 'scheduled',
  execution_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_slot_date (slot_id, date),
  INDEX idx_plan (session_plan_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_slot_date (slot_id, date, status)  -- Prevent duplicates
);

-- Session Executions (Immutable History with Snapshot + Attendance)
CREATE TABLE session_executions (
  id VARCHAR(36) PRIMARY KEY,
  session_plan_id VARCHAR(36) NOT NULL,
  session_plan_name VARCHAR(255) NOT NULL,
  session_plan_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
  sections_snapshot JSON NOT NULL CHECK (JSON_VALID(sections_snapshot)),
  slot_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  instructor VARCHAR(255),
  notes TEXT,
  member_ids JSON NOT NULL CHECK (JSON_VALID(member_ids)),  -- Array of member IDs present
  attendee_count INT DEFAULT 0,  -- Cached count
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_plan (session_plan_id),
  INDEX idx_slot (slot_id),
  UNIQUE KEY unique_slot_date (slot_id, date)  -- DUPLICATE PREVENTION
);
```

### Storage Key to Endpoint Mapping

Add to `STORAGE_KEY_TO_ENDPOINT` in `storage.ts`:
```typescript
[STORAGE_KEYS.ASANAS]: 'asanas',
[STORAGE_KEYS.SESSION_PLANS]: 'session-plans',
[STORAGE_KEYS.SESSION_PLAN_ALLOCATIONS]: 'session-plan-allocations',
[STORAGE_KEYS.SESSION_EXECUTIONS]: 'session-executions',
```

### API Client Stubs

Add to `src/services/api.ts`:
```typescript
export const asanasApi = createApiClient<Asana>('asanas');
export const sessionPlansApi = createApiClient<SessionPlan>('session-plans');
export const sessionPlanAllocationsApi = createApiClient<SessionPlanAllocation>('session-plan-allocations');
export const sessionExecutionsApi = createApiClient<SessionExecution>('session-executions');
```

---

## 5. UI Components & Pages

### 5.1 New Pages

| Route | File | Purpose |
|-------|------|---------|
| `/admin/asanas` | `AsanaListPage.tsx` | List/manage asanas |
| `/admin/asanas/new` | `AsanaFormPage.tsx` | Create asana |
| `/admin/asanas/:id` | `AsanaFormPage.tsx` | Edit asana |
| `/admin/session-plans` | `SessionPlanListPage.tsx` | List plans with **Clone** button |
| `/admin/session-plans/new` | `SessionPlanFormPage.tsx` | Create plan (builder) |
| `/admin/session-plans/:id` | `SessionPlanDetailPage.tsx` | View plan details |
| `/admin/session-plans/:id/edit` | `SessionPlanFormPage.tsx` | Edit plan (new version) |
| `/admin/session-allocations` | `SessionAllocationPage.tsx` | **NEW**: Allocate plans to slots/dates |
| `/admin/session-executions` | `SessionExecutionListPage.tsx` | List executions with attendee count |
| `/admin/session-executions/record` | `RecordExecutionPage.tsx` | Record execution (shows attendance) |
| `/admin/session-reports` | `SessionReportsPage.tsx` | Analytics dashboard |

### 5.2 Key Components

#### AsanaFormPage.tsx
- Form fields: name, sanskritName, type (dropdown), difficulty (dropdown)
- Multi-select for primaryBodyAreas and secondaryBodyAreas (chips/tags)
- Benefits as editable list (add/remove items)
- Contraindications as editable list

#### SessionPlanFormPage.tsx (Builder)
- **Description field** for general notes/guidance
- Fixed 5-section accordion
- Each section: drag & drop asana cards with **explicit order**
- Asana picker modal with search/filter
- For each item: variation input, duration/reps, intensity, notes
- Auto-calculate total duration per section
- Summary sidebar showing body areas & benefits coverage

#### SessionPlanListPage.tsx
- List with Clone button (→ opens form with pre-filled data)
- Shows last used, usage count, level
- **Overuse badge** for plans used recently

#### SessionAllocationPage.tsx (NEW)
- Calendar or date picker view
- For each date: show 4 slot tiles
- Each tile shows allocated plan (or empty)
- "Allocate" button opens plan picker
- **"Apply to all slots"** button for bulk allocation
- Visual status: scheduled (blue), executed (green), cancelled (gray)

#### SessionPlanPickerModal.tsx
- Grid of plan cards
- Each card shows: name, level, last used, usage count
- Tags for dominant body areas
- Quick preview of benefits
- **Overuse warning banner** (orange) if plan used recently

#### RecordExecutionPage.tsx
- Select slot and date
- Auto-loads allocated plan (if exists) or allows manual selection
- Shows **attendance summary**: "12 members marked present"
- Preview of members who will be linked
- **Duplicate prevention**: Shows error if execution already exists
- On save: creates execution with memberIds populated

#### SessionReportsPage.tsx
- Period selector (Monthly/Quarterly/Annual)
- Tab view: Asana Usage | Body Area Focus | Benefit Coverage | Plan Effectiveness
- Tables with sorting
- Optional: Bar charts for visual representation
- **Member participation** data from execution.memberIds

#### OveruseWarningBadge.tsx (NEW Component)
- Small badge/tooltip showing overuse reason
- Orange warning color
- Used in plan list, plan picker, allocation page

---

## 6. Implementation Order (MVP Phases)

### Phase 1: Foundation (Types, Constants, Asana Service)
1. Add types to `src/types/index.ts`:
   - Asana, SessionPlan, SessionPlanAllocation, SessionExecution
   - SectionItem (with `order` field), SessionPlanSection
   - Filter types, constants (BODY_AREAS, SECTION_TYPES, etc.)
2. Add storage keys to `src/constants/index.ts`
3. Add body area labels, section labels, option arrays to constants
4. Add asanaService to `src/services/storage.ts` (with async namespace)
5. Add API client stubs to `src/services/api.ts`
6. Create AsanaListPage with `useFreshData(['asanas'])`
7. Create AsanaFormPage
8. Add routes to `src/router/routes.tsx`
9. Add "Asanas" link to Sidebar (under a new "Session Planning" section)

### Phase 2: Session Plans (Builder + Clone)
1. Add sessionPlanService to storage.ts (with async namespace)
   - Include `clone()` method
   - Include `getOveruseWarning()` method
2. Create SessionPlanListPage with `useFreshData(['session-plans', 'asanas'])`
   - Add Clone button per plan
   - Show overuse warning badge
3. Create SessionPlanFormPage (builder with 5 fixed sections)
   - Add description field
   - Fixed accordion for 5 sections
   - AsanaPicker component for adding asanas
   - SectionBuilder component with **explicit order** drag & drop
4. Create SessionPlanDetailPage (read-only view)
5. Create OveruseWarningBadge component
6. Add routes and Sidebar link

### Phase 3: Session Allocation (NEW)
1. Add sessionPlanAllocationService to storage.ts
   - `allocate()`, `allocateToAllSlots()`, `cancel()`, `markExecuted()`
2. Create SessionAllocationPage with `useFreshData(['session-plan-allocations', 'session-plans'])`
   - Date picker / calendar view
   - 4 slot tiles per day
   - Allocate button with plan picker
   - "Apply to all slots" bulk action
3. Update SessionPlanPickerModal to show overuse warnings
4. Add routes and Sidebar link

### Phase 4: Execution Tracking (with Attendance Integration)
1. Add sessionExecutionService to storage.ts
   - **Duplicate prevention** in create()
   - **Attendance integration** - auto-populate memberIds
   - `getByMember()` for member history
2. Create SessionExecutionListPage with `useFreshData(['session-executions'])`
   - Show attendee count column
3. Create RecordExecutionPage
   - Auto-load allocated plan
   - Show attendance summary before save
   - Duplicate prevention error display
4. Add routes and Sidebar link

### Phase 5: Reports & Analytics
1. Add sessionAnalyticsService (computed from execution snapshots)
2. Create SessionReportsPage with `useFreshData(['session-executions', 'asanas'])`
   - Tab 1: Asana Usage Report
   - Tab 2: Body Area Focus Report
   - Tab 3: Benefit Coverage Report
   - Tab 4: Plan Effectiveness
3. Period selector (Monthly/Quarterly/Annual)
4. Add route and Sidebar link

### Phase 6: Seed Data (Hybrid Approach - API + Manual)

**Strategy**: Pre-seed ~50 common asanas from public API, enrich with body areas, add pranayama/kriyas manually.

**Public API Source**: [alexcumplido/yoga-api](https://github.com/alexcumplido/yoga-api)
- Base URL: `https://yoga-api-nzy4.onrender.com/v1/poses`
- Provides: english_name, sanskrit_name, difficulty_level, pose_benefits

**Data Enrichment Required** (not in public API):
- `type`: Classify as 'asana' (all from API are asanas)
- `primaryBodyAreas[]`: Map from pose names (e.g., Tadasana → spine, core)
- `secondaryBodyAreas[]`: Additional areas affected
- Pranayama & Kriyas: Add manually (not in any public API)

**Implementation in `src/services/storage.ts`**:
```typescript
// Pre-seeded asanas (enriched from public API)
const SEED_ASANAS: Omit<Asana, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // === WARM UP / STANDING ===
  { name: 'Tadasana', sanskritName: 'Mountain Pose', type: 'asana', difficulty: 'beginner',
    primaryBodyAreas: ['spine', 'core'], secondaryBodyAreas: ['ankles'],
    benefits: ['Improves posture', 'Strengthens thighs', 'Increases awareness'], isActive: true },
  { name: 'Uttanasana', sanskritName: 'Standing Forward Bend', type: 'asana', difficulty: 'beginner',
    primaryBodyAreas: ['hamstrings', 'spine'], secondaryBodyAreas: ['calves', 'hips'],
    benefits: ['Stretches hamstrings', 'Calms the mind', 'Relieves stress'], isActive: true },
  // ... ~30 more asanas with body area mapping

  // === SURYA NAMASKARA ===
  { name: 'Surya Namaskar A', sanskritName: 'Sun Salutation A', type: 'asana', difficulty: 'beginner',
    primaryBodyAreas: ['spine', 'shoulders', 'core'], secondaryBodyAreas: ['hamstrings', 'hips'],
    benefits: ['Full body warm-up', 'Increases flexibility', 'Builds strength'], isActive: true },

  // === PRANAYAMA (Manual - not in public API) ===
  { name: 'Anulom Vilom', sanskritName: 'Alternate Nostril Breathing', type: 'pranayama', difficulty: 'beginner',
    primaryBodyAreas: ['respiratory', 'nervous_system'], secondaryBodyAreas: [],
    benefits: ['Balances nervous system', 'Reduces stress', 'Improves focus'], isActive: true },
  { name: 'Kapalbhati', sanskritName: 'Skull Shining Breath', type: 'pranayama', difficulty: 'intermediate',
    primaryBodyAreas: ['core', 'respiratory'], secondaryBodyAreas: ['nervous_system'],
    benefits: ['Cleanses respiratory system', 'Energizes body', 'Strengthens abdominals'],
    contraindications: ['High blood pressure', 'Heart disease', 'Pregnancy'], isActive: true },
  { name: 'Bhramari', sanskritName: 'Humming Bee Breath', type: 'pranayama', difficulty: 'beginner',
    primaryBodyAreas: ['respiratory', 'nervous_system'], secondaryBodyAreas: ['neck'],
    benefits: ['Calms the mind', 'Reduces anxiety', 'Improves sleep'], isActive: true },

  // === RELAXATION ===
  { name: 'Shavasana', sanskritName: 'Corpse Pose', type: 'relaxation', difficulty: 'beginner',
    primaryBodyAreas: ['nervous_system'], secondaryBodyAreas: ['spine'],
    benefits: ['Deep relaxation', 'Reduces stress', 'Integrates practice'], isActive: true },

  // === KRIYAS (Manual) ===
  { name: 'Jal Neti', sanskritName: 'Nasal Cleansing', type: 'kriya', difficulty: 'beginner',
    primaryBodyAreas: ['respiratory'], secondaryBodyAreas: [],
    benefits: ['Clears nasal passages', 'Reduces allergies', 'Improves breathing'],
    contraindications: ['Ear infection', 'Nosebleed'], isActive: true },
];

// Body area mapping helper (for future API imports)
const POSE_BODY_AREA_MAP: Record<string, { primary: BodyArea[]; secondary: BodyArea[] }> = {
  'Tadasana': { primary: ['spine', 'core'], secondary: ['ankles'] },
  'Uttanasana': { primary: ['hamstrings', 'spine'], secondary: ['calves', 'hips'] },
  'Adho Mukha Svanasana': { primary: ['shoulders', 'hamstrings'], secondary: ['spine', 'calves'] },
  'Bhujangasana': { primary: ['spine'], secondary: ['shoulders', 'core'] },
  'Trikonasana': { primary: ['hips', 'hamstrings'], secondary: ['spine', 'shoulders'] },
  // ... mapping for all imported poses
};

// Sample session plan
const SEED_SESSION_PLANS = [
  {
    name: 'Beginner Morning Flow',
    description: 'Gentle morning sequence suitable for all levels. Focus on awakening the body and mind.',
    level: 'beginner' as DifficultyLevel,
    sections: [
      { sectionType: 'WARM_UP' as SectionType, order: 1, items: [/* filled with asana IDs after creation */] },
      { sectionType: 'SURYA_NAMASKARA' as SectionType, order: 2, items: [] },
      { sectionType: 'ASANA_SEQUENCE' as SectionType, order: 3, items: [] },
      { sectionType: 'PRANAYAMA' as SectionType, order: 4, items: [] },
      { sectionType: 'SHAVASANA' as SectionType, order: 5, items: [] },
    ],
  },
];
```

**Seed Data Includes**:
- ~50 asanas with body area mapping
- ~10 pranayama techniques
- ~5 kriyas
- ~3 relaxation poses
- 2-3 sample session plans
- Sample allocations for current week
- Sample executions for past 2 weeks with memberIds

### Phase 7: Database & API (Post-MVP)
1. Create `database/migration_session_planning.sql`
2. Create PHP endpoint handlers:
   - `api/endpoints/asanas.php` (AsanasHandler)
   - `api/endpoints/session-plans.php` (SessionPlansHandler)
   - `api/endpoints/session-plan-allocations.php` (SessionPlanAllocationsHandler)
   - `api/endpoints/session-executions.php` (SessionExecutionsHandler)
3. Add endpoints to `$validEndpoints` in `api/index.php`
4. Add JSON decode handling in PHP handlers for array columns
5. Test dual-mode sync

---

## 7. Files to Create/Modify

### New Files
```
src/pages/admin/session-planning/AsanaListPage.tsx
src/pages/admin/session-planning/AsanaFormPage.tsx
src/pages/admin/session-planning/SessionPlanListPage.tsx
src/pages/admin/session-planning/SessionPlanFormPage.tsx
src/pages/admin/session-planning/SessionPlanDetailPage.tsx
src/pages/admin/session-planning/SessionAllocationPage.tsx       # NEW
src/pages/admin/session-planning/SessionExecutionListPage.tsx
src/pages/admin/session-planning/RecordExecutionPage.tsx
src/pages/admin/session-planning/SessionReportsPage.tsx
src/components/sessionPlanning/AsanaPicker.tsx
src/components/sessionPlanning/SectionBuilder.tsx
src/components/sessionPlanning/SessionPlanCard.tsx
src/components/sessionPlanning/SessionPlanPickerModal.tsx
src/components/sessionPlanning/BodyAreaBadges.tsx
src/components/sessionPlanning/OveruseWarningBadge.tsx           # NEW
database/migration_session_planning.sql
api/endpoints/asanas.php
api/endpoints/session-plans.php
api/endpoints/session-plan-allocations.php                       # NEW
api/endpoints/session-executions.php
```

### Modified Files
```
src/types/index.ts (add all new types directly here)
src/constants/index.ts (add storage keys, body area labels, section labels)
src/services/storage.ts (add 5 new services with async namespaces)
src/services/api.ts (add API client stubs)
src/services/index.ts (export new services)
src/router/routes.tsx (add new routes with lazy imports)
src/components/layout/Sidebar.tsx (add "Session Planning" section)
api/index.php (add endpoints to $validEndpoints)
```

### Sidebar Navigation Structure
Add after "Attendance" section:
```tsx
// Session Planning Section
<SidebarSection title="Session Planning">
  <SidebarLink to="/admin/asanas" icon={BookOpen}>Asanas</SidebarLink>
  <SidebarLink to="/admin/session-plans" icon={Layout}>Session Plans</SidebarLink>
  <SidebarLink to="/admin/session-allocations" icon={Calendar}>Allocations</SidebarLink>
  <SidebarLink to="/admin/session-executions" icon={CheckCircle}>Executions</SidebarLink>
  <SidebarLink to="/admin/session-reports" icon={BarChart}>Reports</SidebarLink>
</SidebarSection>
```

---

## 8. Verification Plan

### Build Verification
```bash
npm run dev   # Start dev server
npm run build # Verify no TypeScript errors
```

### Manual Testing Checklist

1. **Asana Master**
   - [ ] Create asana with all fields (name, sanskrit, type, body areas, benefits)
   - [ ] Verify body areas are from controlled vocabulary only
   - [ ] Verify benefits stored as array (not paragraph)
   - [ ] Edit existing asana
   - [ ] Deactivate asana → verify hidden from picker
   - [ ] Search asanas by name/sanskrit name
   - [ ] Filter by type, difficulty

2. **Session Plan Builder**
   - [ ] Create new plan with **description field**
   - [ ] All 5 sections visible in fixed order
   - [ ] Add asanas to each section via picker modal
   - [ ] Set variation, duration/reps, intensity, notes for items
   - [ ] Reorder items within section (verify **explicit order** persists)
   - [ ] Remove item from section
   - [ ] Verify version = 1 on create
   - [ ] Edit existing plan → verify version increments
   - [ ] Summary shows total duration per section
   - [ ] Summary shows dominant body areas and key benefits

3. **Session Plan Clone (NEW)**
   - [ ] Clone button visible on plan list
   - [ ] Clone creates new plan with "(Copy)" suffix
   - [ ] Cloned plan has version = 1, usageCount = 0
   - [ ] Cloned plan is independent (editing doesn't affect original)

4. **Session Allocation (NEW)**
   - [ ] Navigate to Allocations page
   - [ ] Select date and see 4 slot tiles
   - [ ] Allocate plan to single slot
   - [ ] "Apply to all slots" allocates same plan to all 4 slots
   - [ ] Allocated plans show in tiles
   - [ ] Can cancel allocation
   - [ ] Cannot allocate if slot already has active allocation

5. **Overuse Warning (NEW)**
   - [ ] Plan used today shows warning badge
   - [ ] Plan used in last 3 days shows warning
   - [ ] Plan used 5+ times in 30 days shows warning
   - [ ] Warning appears in: plan list, plan picker, allocation page
   - [ ] Warning shows reason (e.g., "Used 2 days ago")

6. **Session Execution**
   - [ ] Record execution page auto-loads allocated plan (if exists)
   - [ ] Plan picker shows overuse warnings
   - [ ] **Duplicate prevention**: Cannot record same slot+date twice
   - [ ] Error message shows if duplicate attempted
   - [ ] Shows attendance count before save
   - [ ] On save: memberIds populated from attendance
   - [ ] Execution list shows attendee count column
   - [ ] Verify allocation status changes to "executed"

7. **Attendance Integration (NEW)**
   - [ ] Mark attendance for members in a slot/date
   - [ ] Record execution for that slot/date
   - [ ] Verify memberIds in execution matches present members
   - [ ] Member detail page shows session history (via getByMember)

8. **Reports**
   - [ ] Asana Usage: shows correct counts per asana
   - [ ] Asana Usage: shows average duration
   - [ ] Body Area Focus: shows percentage distribution
   - [ ] Benefit Coverage: aggregates from asana benefits
   - [ ] Period filters work (monthly/quarterly/annual)
   - [ ] Data computed from execution snapshots (not current plan state)

9. **Edge Cases**
   - [ ] Edit plan after execution → old execution shows snapshot data
   - [ ] Delete asana after execution → reports show "Unknown/Deleted"
   - [ ] Empty reports when no executions in period
   - [ ] All pages handle loading state with `useFreshData`
   - [ ] Allocation without attendance → execution has empty memberIds

---

## 9. NOW Included (Enhancements)

These enhancements are now part of the plan:
- ✅ Session Plan Allocation (pre-scheduling)
- ✅ Duplicate Execution Prevention
- ✅ Plan Description/Notes Field
- ✅ Explicit Order in SectionItem
- ✅ Overuse Warning System
- ✅ Session Plan Clone
- ✅ Attendance Integration (auto-link members to executions)

## 10. NOT in MVP Scope

Per spec, these are explicitly excluded:
- Instructor feedback
- Injury-aware planning
- AI-based plan suggestions
- Custom sections (fixed 5 only)
- Free-text body areas (controlled vocabulary only)
- Recurring allocation templates (e.g., "every Monday use plan X")
