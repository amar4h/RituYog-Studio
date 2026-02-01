/**
 * Yoga Studio Management - Storage Service
 * Phase 1: Core Operations
 * Provides CRUD operations with localStorage persistence
 *
 * DUAL-MODE STORAGE:
 * - localStorage (default): Uses browser localStorage for data persistence
 * - api: Uses PHP/MySQL backend via API calls
 *
 * Mode is controlled by VITE_STORAGE_MODE environment variable.
 * All existing method signatures are preserved for backward compatibility.
 */

import { v4 as uuidv4 } from 'uuid';
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
  authApi,
  // Inventory & Expenses
  productsApi,
  inventoryApi,
  expensesApi,
} from './api';
import type {
  BaseEntity,
  Member,
  Lead,
  MembershipPlan,
  MembershipSubscription,
  SessionSlot,
  SlotSubscription,
  SlotAvailability,
  Invoice,
  Payment,
  TrialBooking,
  StudioSettings,
  AttendanceRecord,
  AttendanceStatus,
  MemberAttendanceSummary,
  NotificationLog,
  NotificationType,
  // Product & Inventory types
  Product,
  ProductCategory,
  InventoryTransaction,
  InventoryTransactionType,
  Expense,
  ExpenseCategory,
  ExpensePaymentStatus,
  ExpenseItem,
  PaymentMethod,
  // Legacy types
  Instructor,
  YogaClass,
  ClassSchedule,
  Booking,
  TrialRequest,
} from '../types';
import {
  STORAGE_KEYS,
  DEFAULT_STUDIO_SETTINGS,
  DEFAULT_SESSION_SLOTS,
  DEFAULT_MEMBERSHIP_PLANS,
} from '../constants';
import { calculateSubscriptionEndDate } from '../utils/dateUtils';

// ============================================
// GENERIC CRUD OPERATIONS
// ============================================

function getAll<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading from storage (${key}):`, error);
    return [];
  }
}

function saveAll<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to storage (${key}):`, error);
    throw new Error('Failed to save data. Storage may be full.');
  }
}

function getById<T extends BaseEntity>(key: string, id: string): T | null {
  const items = getAll<T>(key);
  return items.find(item => item.id === id) || null;
}

function create<T extends BaseEntity>(
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

function update<T extends BaseEntity>(
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

function remove<T extends BaseEntity>(key: string, id: string): boolean {
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
function setWaitingCursor(waiting: boolean): void {
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
function performApiWrite(operation: {
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
  fetch(url, {
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
    });
}

// Storage key to endpoint mapping
const STORAGE_KEY_TO_ENDPOINT: Record<string, string> = {
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
};

// Dual-mode create: updates localStorage AND immediately writes to API
function createDual<T extends BaseEntity>(
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
function updateDual<T extends BaseEntity>(
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
function removeDual<T extends BaseEntity>(key: string, id: string): boolean {
  const result = remove<T>(key, id);

  if (result) {
    const endpoint = STORAGE_KEY_TO_ENDPOINT[key];
    if (endpoint) {
      performApiWrite({ type: 'delete', endpoint, id });
    }
  }

  return result;
}

// ============================================
// MEMBER SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const memberService = {
  // Synchronous methods - dual-mode (localStorage + API queue)
  getAll: () => getAll<Member>(STORAGE_KEYS.MEMBERS),
  getById: (id: string) => getById<Member>(STORAGE_KEYS.MEMBERS, id),
  create: (data: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Member>(STORAGE_KEYS.MEMBERS, data),
  update: (id: string, data: Partial<Member>) =>
    updateDual<Member>(STORAGE_KEYS.MEMBERS, id, data),
  delete: (id: string) => removeDual<Member>(STORAGE_KEYS.MEMBERS, id),

  getByEmail: (email: string): Member | null => {
    const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
    return members.find(m => m.email.toLowerCase() === email.toLowerCase()) || null;
  },

  getByPhone: (phone: string): Member | null => {
    const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
    return members.find(m => m.phone === phone) || null;
  },

  getByStatus: (status: Member['status']): Member[] => {
    const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
    return members.filter(m => m.status === status);
  },

  getBySlot: (slotId: string): Member[] => {
    const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
    return members.filter(m => m.assignedSlotId === slotId);
  },

  getActive: (): Member[] => {
    const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
    return members.filter(m => m.status === 'active');
  },

  search: (query: string): Member[] => {
    const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
    const lowerQuery = query.toLowerCase();
    return members.filter(m =>
      m.firstName.toLowerCase().includes(lowerQuery) ||
      m.lastName.toLowerCase().includes(lowerQuery) ||
      m.email.toLowerCase().includes(lowerQuery) ||
      m.phone.includes(query)
    );
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // Use these in React Query or async contexts
  // ============================================
  async: {
    getAll: async (): Promise<Member[]> => {
      if (isApiMode()) {
        return membersApi.getAll() as Promise<Member[]>;
      }
      return getAll<Member>(STORAGE_KEYS.MEMBERS);
    },

    getById: async (id: string): Promise<Member | null> => {
      if (isApiMode()) {
        return membersApi.getById(id) as Promise<Member | null>;
      }
      return getById<Member>(STORAGE_KEYS.MEMBERS, id);
    },

    create: async (data: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>): Promise<Member> => {
      if (isApiMode()) {
        return membersApi.create(data as Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) as Promise<Member>;
      }
      return create<Member>(STORAGE_KEYS.MEMBERS, data);
    },

    update: async (id: string, data: Partial<Member>): Promise<Member | null> => {
      if (isApiMode()) {
        return membersApi.update(id, data as Partial<Member>) as Promise<Member | null>;
      }
      return update<Member>(STORAGE_KEYS.MEMBERS, id, data);
    },

    delete: async (id: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await membersApi.delete(id);
        return result.deleted;
      }
      return remove<Member>(STORAGE_KEYS.MEMBERS, id);
    },

    getByEmail: async (email: string): Promise<Member | null> => {
      if (isApiMode()) {
        return membersApi.getByEmail(email) as Promise<Member | null>;
      }
      const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
      return members.find(m => m.email.toLowerCase() === email.toLowerCase()) || null;
    },

    getByPhone: async (phone: string): Promise<Member | null> => {
      if (isApiMode()) {
        return membersApi.getByPhone(phone) as Promise<Member | null>;
      }
      const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
      return members.find(m => m.phone === phone) || null;
    },

    getByStatus: async (status: Member['status']): Promise<Member[]> => {
      if (isApiMode()) {
        return membersApi.getByStatus(status) as Promise<Member[]>;
      }
      const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
      return members.filter(m => m.status === status);
    },

    getBySlot: async (slotId: string): Promise<Member[]> => {
      if (isApiMode()) {
        return membersApi.getBySlot(slotId) as Promise<Member[]>;
      }
      const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
      return members.filter(m => m.assignedSlotId === slotId);
    },

    getActive: async (): Promise<Member[]> => {
      if (isApiMode()) {
        return membersApi.getActive() as Promise<Member[]>;
      }
      const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
      return members.filter(m => m.status === 'active');
    },

    search: async (query: string): Promise<Member[]> => {
      if (isApiMode()) {
        return membersApi.search(query) as Promise<Member[]>;
      }
      const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
      const lowerQuery = query.toLowerCase();
      return members.filter(m =>
        m.firstName.toLowerCase().includes(lowerQuery) ||
        m.lastName.toLowerCase().includes(lowerQuery) ||
        m.email.toLowerCase().includes(lowerQuery) ||
        m.phone.includes(query)
      );
    },
  },
};

// ============================================
// LEAD SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const leadService = {
  // Synchronous methods - dual-mode (localStorage + API queue)
  getAll: () => getAll<Lead>(STORAGE_KEYS.LEADS),
  getById: (id: string) => getById<Lead>(STORAGE_KEYS.LEADS, id),
  create: (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Lead>(STORAGE_KEYS.LEADS, data),
  update: (id: string, data: Partial<Lead>) =>
    updateDual<Lead>(STORAGE_KEYS.LEADS, id, data),
  delete: (id: string) => removeDual<Lead>(STORAGE_KEYS.LEADS, id),

  getByEmail: (email: string): Lead | null => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    return leads.find(l => l.email.toLowerCase() === email.toLowerCase()) || null;
  },

  getByPhone: (phone: string): Lead | null => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    return leads.find(l => l.phone === phone) || null;
  },

  getByStatus: (status: Lead['status']): Lead[] => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    return leads.filter(l => l.status === status);
  },

  getPending: (): Lead[] => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    return leads.filter(l =>
      ['new', 'contacted', 'trial-scheduled', 'follow-up', 'interested'].includes(l.status)
    );
  },

  // Get all unconverted leads (excludes leads with status 'converted')
  // Use this for the Leads list page to not show converted leads
  getUnconverted: (): Lead[] => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    return leads.filter(l => l.status !== 'converted');
  },

  getForFollowUp: (): Lead[] => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    const today = new Date().toISOString().split('T')[0];
    return leads.filter(l =>
      l.nextFollowUpDate && l.nextFollowUpDate <= today &&
      !['converted', 'not-interested', 'lost'].includes(l.status)
    );
  },

  convertToMember: (leadId: string): Member => {
    const lead = leadService.getById(leadId);
    if (!lead) throw new Error('Lead not found');

    // Check if already converted
    if (lead.convertedToMemberId) {
      throw new Error('Lead already converted');
    }

    // Check if email already exists as member
    const existingMember = memberService.getByEmail(lead.email);
    if (existingMember) {
      throw new Error('A member with this email already exists');
    }

    // Create member from lead data
    // Convert lead's emergency contact strings to Member's EmergencyContact object
    const emergencyContact = lead.emergencyContact || lead.emergencyPhone
      ? {
          name: lead.emergencyContact || '',
          phone: lead.emergencyPhone || '',
        }
      : undefined;

    const member = memberService.create({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      whatsappNumber: lead.whatsappNumber,
      dateOfBirth: lead.dateOfBirth,
      age: lead.age,
      gender: lead.gender,
      address: lead.address,
      emergencyContact,
      medicalConditions: lead.medicalConditions,
      healthNotes: lead.healthNotes,
      consentRecords: lead.consentRecords,
      status: 'pending', // Will become active when subscription is added
      source: 'lead-conversion',
      convertedFromLeadId: leadId,
      assignedSlotId: lead.preferredSlotId,
      classesAttended: 0,
      notes: lead.notes,
    });

    // Update lead status
    leadService.update(leadId, {
      status: 'converted',
      convertedToMemberId: member.id,
      conversionDate: new Date().toISOString(),
    });

    return member;
  },

  search: (query: string): Lead[] => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    const lowerQuery = query.toLowerCase();
    return leads.filter(l =>
      l.firstName.toLowerCase().includes(lowerQuery) ||
      l.lastName.toLowerCase().includes(lowerQuery) ||
      l.email.toLowerCase().includes(lowerQuery) ||
      l.phone.includes(query)
    );
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    getAll: async (): Promise<Lead[]> => {
      if (isApiMode()) {
        return leadsApi.getAll() as Promise<Lead[]>;
      }
      return getAll<Lead>(STORAGE_KEYS.LEADS);
    },

    getById: async (id: string): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.getById(id) as Promise<Lead | null>;
      }
      return getById<Lead>(STORAGE_KEYS.LEADS, id);
    },

    create: async (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> => {
      if (isApiMode()) {
        return leadsApi.create(data as Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) as Promise<Lead>;
      }
      return create<Lead>(STORAGE_KEYS.LEADS, data);
    },

    update: async (id: string, data: Partial<Lead>): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.update(id, data as Partial<Lead>) as Promise<Lead | null>;
      }
      return update<Lead>(STORAGE_KEYS.LEADS, id, data);
    },

    delete: async (id: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await leadsApi.delete(id);
        return result.deleted;
      }
      return remove<Lead>(STORAGE_KEYS.LEADS, id);
    },

    getByEmail: async (email: string): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.getByEmail(email) as Promise<Lead | null>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      return leads.find(l => l.email.toLowerCase() === email.toLowerCase()) || null;
    },

    getByPhone: async (phone: string): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.getByPhone(phone) as Promise<Lead | null>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      return leads.find(l => l.phone === phone) || null;
    },

    getByStatus: async (status: Lead['status']): Promise<Lead[]> => {
      if (isApiMode()) {
        return leadsApi.getByStatus(status) as Promise<Lead[]>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      return leads.filter(l => l.status === status);
    },

    getPending: async (): Promise<Lead[]> => {
      if (isApiMode()) {
        return leadsApi.getPending() as Promise<Lead[]>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      return leads.filter(l =>
        ['new', 'contacted', 'trial-scheduled', 'follow-up', 'interested'].includes(l.status)
      );
    },

    // Get all unconverted leads (excludes leads with status 'converted')
    getUnconverted: async (): Promise<Lead[]> => {
      if (isApiMode()) {
        // In API mode, filter on server or get all and filter
        const leads = await leadsApi.getAll() as Lead[];
        return leads.filter(l => l.status !== 'converted');
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      return leads.filter(l => l.status !== 'converted');
    },

    getForFollowUp: async (): Promise<Lead[]> => {
      if (isApiMode()) {
        return leadsApi.getForFollowUp() as Promise<Lead[]>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      const today = new Date().toISOString().split('T')[0];
      return leads.filter(l =>
        l.nextFollowUpDate && l.nextFollowUpDate <= today &&
        !['converted', 'not-interested', 'lost'].includes(l.status)
      );
    },

    // Note: convertToMember is complex business logic that stays in frontend
    // In API mode, it uses the async service methods internally
    convertToMember: async (leadId: string): Promise<Member> => {
      if (isApiMode()) {
        const lead = await leadService.async.getById(leadId);
        if (!lead) throw new Error('Lead not found');

        if (lead.convertedToMemberId) {
          throw new Error('Lead already converted');
        }

        const existingMember = await memberService.async.getByEmail(lead.email);
        if (existingMember) {
          throw new Error('A member with this email already exists');
        }

        const emergencyContact = lead.emergencyContact || lead.emergencyPhone
          ? { name: lead.emergencyContact || '', phone: lead.emergencyPhone || '' }
          : undefined;

        const member = await memberService.async.create({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          whatsappNumber: lead.whatsappNumber,
          dateOfBirth: lead.dateOfBirth,
          age: lead.age,
          gender: lead.gender,
          address: lead.address,
          emergencyContact,
          medicalConditions: lead.medicalConditions,
          healthNotes: lead.healthNotes,
          consentRecords: lead.consentRecords,
          status: 'pending',
          source: 'lead-conversion',
          convertedFromLeadId: leadId,
          assignedSlotId: lead.preferredSlotId,
          classesAttended: 0,
          notes: lead.notes,
        });

        // Wait for member to be confirmed in database before updating lead
        // This handles database replication lag on shared hosting (Hostinger)
        const maxWaitAttempts = 10;
        let memberConfirmed = false;
        for (let attempt = 1; attempt <= maxWaitAttempts; attempt++) {
          const fetchedMember = await memberService.async.getById(member.id);
          if (fetchedMember) {
            memberConfirmed = true;
            break;
          }
          // Wait before next check (200ms, 400ms, 600ms... up to 2 seconds)
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        }

        if (!memberConfirmed) {
          throw new Error('Member creation timed out. Please try again.');
        }

        // Now safe to update lead with FK reference to member
        await leadService.async.update(leadId, {
          status: 'converted',
          convertedToMemberId: member.id,
          conversionDate: new Date().toISOString(),
        });

        // Also notify API about conversion for any server-side tracking
        await leadsApi.markConverted(leadId, member.id);

        return member;
      }
      // localStorage mode - use synchronous version
      return leadService.convertToMember(leadId);
    },

    search: async (query: string): Promise<Lead[]> => {
      if (isApiMode()) {
        return leadsApi.search(query) as Promise<Lead[]>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      const lowerQuery = query.toLowerCase();
      return leads.filter(l =>
        l.firstName.toLowerCase().includes(lowerQuery) ||
        l.lastName.toLowerCase().includes(lowerQuery) ||
        l.email.toLowerCase().includes(lowerQuery) ||
        l.phone.includes(query)
      );
    },
  },
};

// ============================================
// MEMBERSHIP PLAN SERVICE
// ============================================

export const membershipPlanService = {
  getAll: () => getAll<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS),
  getById: (id: string) => getById<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, id),
  // Dual-mode: updates localStorage AND immediately writes to API
  create: (data: Omit<MembershipPlan, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, data),
  update: (id: string, data: Partial<MembershipPlan>) =>
    updateDual<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, id, data),
  delete: (id: string) => removeDual<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, id),

  getActive: (): MembershipPlan[] => {
    const plans = getAll<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS);
    return plans.filter(p => p.isActive);
  },

  // Initialize default plans if none exist
  initializeDefaults: (): void => {
    const plans = getAll<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS);
    if (plans.length === 0) {
      DEFAULT_MEMBERSHIP_PLANS.forEach(plan => {
        membershipPlanService.create(plan);
      });
    }
  },
};

// ============================================
// MEMBERSHIP SUBSCRIPTION SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const subscriptionService = {
  // Synchronous methods - dual-mode (localStorage + API queue)
  getAll: () => getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS),
  getById: (id: string) => getById<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, id),
  create: (data: Omit<MembershipSubscription, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, data),
  update: (id: string, data: Partial<MembershipSubscription>) =>
    updateDual<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, id, data),
  delete: (id: string) => removeDual<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, id),

  getByMember: (memberId: string): MembershipSubscription[] => {
    const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
    return subscriptions
      .filter(s => s.memberId === memberId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  },

  getActiveMemberSubscription: (memberId: string): MembershipSubscription | null => {
    const subscriptions = subscriptionService.getByMember(memberId);
    const today = new Date().toISOString().split('T')[0];
    return subscriptions.find(s =>
      s.status === 'active' &&
      s.startDate <= today &&
      s.endDate >= today
    ) || null;
  },

  getExpiringSoon: (daysAhead: number = 7): MembershipSubscription[] => {
    const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    return subscriptions.filter(s =>
      s.status === 'active' &&
      s.endDate >= todayStr &&
      s.endDate <= futureStr
    );
  },

  // Get subscriptions that expired within the last N days
  getRecentlyExpired: (daysBack: number = 7): MembershipSubscription[] => {
    const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysBack);

    const todayStr = today.toISOString().split('T')[0];
    const pastStr = pastDate.toISOString().split('T')[0];

    return subscriptions.filter(s =>
      (s.status === 'active' || s.status === 'expired') &&
      s.endDate < todayStr &&
      s.endDate >= pastStr
    );
  },

  hasActiveSubscription: (memberId: string): boolean => {
    return subscriptionService.getActiveMemberSubscription(memberId) !== null;
  },

  // Check if member has a pending renewal (currently active subscription + future scheduled renewal)
  // Returns true only when member has BOTH an active subscription AND a future one waiting to start
  hasPendingRenewal: (memberId: string): boolean => {
    const subscriptions = subscriptionService.getByMember(memberId);
    const today = new Date().toISOString().split('T')[0];

    // Find currently active subscription
    const activeSubscription = subscriptions.find(s =>
      s.status === 'active' &&
      s.startDate <= today &&
      s.endDate >= today
    );

    if (!activeSubscription) return false;

    // Check if there's a future subscription (scheduled or active with future start date)
    const hasFutureSubscription = subscriptions.some(s =>
      s.id !== activeSubscription.id &&
      (s.status === 'scheduled' || (s.status === 'active' && s.startDate > today))
    );

    return hasFutureSubscription;
  },

  // Get active subscriptions for a slot on a specific date
  getActiveForSlotOnDate: (slotId: string, date: string): MembershipSubscription[] => {
    const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
    return subscriptions.filter(s =>
      s.slotId === slotId &&
      s.status === 'active' &&
      s.startDate <= date &&
      s.endDate >= date
    );
  },

  // Check slot capacity for a subscription period
  checkSlotCapacity: (
    slotId: string,
    startDate: string,
    endDate: string
  ): { available: boolean; isExceptionOnly: boolean; currentBookings: number; normalCapacity: number; totalCapacity: number; message: string } => {
    const slot = slotService.getById(slotId);
    if (!slot) {
      return {
        available: false,
        isExceptionOnly: false,
        currentBookings: 0,
        normalCapacity: 0,
        totalCapacity: 0,
        message: 'Slot not found'
      };
    }

    // Count overlapping subscriptions (active or scheduled)
    const allSubscriptions = subscriptionService.getAll();
    const overlappingSubscriptions = allSubscriptions.filter(s =>
      s.slotId === slotId &&
      ['active', 'scheduled', 'pending'].includes(s.status) &&
      s.startDate <= endDate && s.endDate >= startDate
    );

    // Deduplicate by member to avoid counting renewals twice
    const memberIds = new Set<string>();
    const uniqueBookings = overlappingSubscriptions.filter(s => {
      if (memberIds.has(s.memberId)) return false;
      memberIds.add(s.memberId);
      return true;
    });

    const currentBookings = uniqueBookings.length;
    const normalCapacity = slot.capacity;
    const totalCapacity = slot.capacity + slot.exceptionCapacity;

    if (currentBookings >= totalCapacity) {
      return {
        available: false,
        isExceptionOnly: false,
        currentBookings,
        normalCapacity,
        totalCapacity,
        message: `Slot is full (${currentBookings}/${totalCapacity})`
      };
    }

    if (currentBookings >= normalCapacity) {
      return {
        available: true,
        isExceptionOnly: true,
        currentBookings,
        normalCapacity,
        totalCapacity,
        message: `Normal capacity full. Will use exception slot (${currentBookings}/${totalCapacity})`
      };
    }

    return {
      available: true,
      isExceptionOnly: false,
      currentBookings,
      normalCapacity,
      totalCapacity,
      message: `Available (${currentBookings}/${normalCapacity} regular slots used)`
    };
  },

  // Create subscription with invoice
  createWithInvoice: (
    memberId: string,
    planId: string,
    slotId: string,
    startDate: string,
    discountAmount: number = 0,
    discountReason?: string,
    notes?: string,
    discountType?: 'fixed' | 'percentage',
    discountPercentage?: number
  ): { subscription: MembershipSubscription; invoice: Invoice; warning?: string } => {
    const plan = membershipPlanService.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const member = memberService.getById(memberId);
    if (!member) throw new Error('Member not found');

    const slot = slotService.getById(slotId);
    if (!slot) throw new Error('Session slot not found');

    // Calculate end date based on plan duration (e.g., Jan 1 + 1 month = Jan 31)
    const endDate = calculateSubscriptionEndDate(startDate, plan.durationMonths);

    // Check for overlapping subscriptions
    const existingSubscriptions = subscriptionService.getByMember(memberId);
    const overlappingSubscription = existingSubscriptions.find(s => {
      // Only check active, pending, or scheduled subscriptions
      if (!['active', 'pending', 'scheduled'].includes(s.status)) return false;

      // Check if date ranges overlap
      // Overlap occurs when: newStart <= existingEnd AND newEnd >= existingStart
      return startDate <= s.endDate && endDate >= s.startDate;
    });

    if (overlappingSubscription) {
      const overlapPlan = membershipPlanService.getById(overlappingSubscription.planId);
      throw new Error(
        `Member already has an overlapping subscription (${overlapPlan?.name || 'Unknown'}) ` +
        `from ${overlappingSubscription.startDate} to ${overlappingSubscription.endDate}. ` +
        `Please choose a start date after ${overlappingSubscription.endDate}.`
      );
    }

    // Check if this is a renewal (member already has this slot assigned)
    // Renewals don't consume additional capacity - member is already in the slot
    const isRenewalInSameSlot = member.assignedSlotId === slotId;

    // Check slot capacity - count current active subscriptions for this slot
    // A subscription occupies a slot for its entire duration
    const allSubscriptions = subscriptionService.getAll();
    const activeSubscriptionsInSlot = allSubscriptions.filter(s =>
      s.slotId === slotId &&
      s.status === 'active' &&
      // Check if existing subscription overlaps with new subscription period
      s.startDate <= endDate && s.endDate >= startDate &&
      // Exclude the renewing member from the count (they're already in this slot)
      s.memberId !== memberId
    );

    const currentSlotBookings = activeSubscriptionsInSlot.length;
    const totalCapacity = slot.capacity + slot.exceptionCapacity;

    // Check if slot is completely full (beyond normal + exception capacity)
    // Skip this check for renewals in the same slot - member is already occupying the slot
    if (!isRenewalInSameSlot && currentSlotBookings >= totalCapacity) {
      throw new Error(
        `Slot "${slot.displayName}" is completely full. ` +
        `Current bookings: ${currentSlotBookings}, Total capacity: ${totalCapacity}. ` +
        `Cannot add more members to this slot.`
      );
    }

    // Check if normal capacity is exceeded (will use exception capacity)
    // Skip warning for renewals in the same slot - member is already occupying the slot
    const isUsingExceptionCapacity = !isRenewalInSameSlot && currentSlotBookings >= slot.capacity;

    // Calculate amounts
    const originalAmount = plan.price;
    const payableAmount = Math.max(0, originalAmount - discountAmount);

    // Create subscription with slot
    const subscription = subscriptionService.create({
      memberId,
      planId,
      slotId,
      startDate,
      endDate,
      originalAmount,
      discountAmount,
      discountType,
      discountPercentage,
      discountReason,
      payableAmount,
      status: 'active',
      isExtension: false,
      paymentStatus: 'pending',
      notes,
    });

    // Create invoice
    const invoice = invoiceService.create({
      invoiceNumber: invoiceService.generateInvoiceNumber(),
      invoiceType: 'membership',
      memberId,
      amount: originalAmount,
      discount: discountAmount,
      discountReason,
      totalAmount: payableAmount,
      amountPaid: 0,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: startDate,
      status: 'sent',
      items: [
        {
          description: `${plan.name} Membership (${plan.durationMonths} ${plan.durationMonths === 1 ? 'month' : 'months'}) - ${slot.displayName}`,
          quantity: 1,
          unitPrice: originalAmount,
          total: originalAmount,
        },
      ],
      subscriptionId: subscription.id,
    });

    // Update subscription with invoice ID
    subscriptionService.update(subscription.id, { invoiceId: invoice.id });

    // Update member status to active and assign slot
    memberService.update(memberId, { status: 'active', assignedSlotId: slotId });

    // Create or update slot subscription
    const existingSlotSub = slotSubscriptionService.getByMember(memberId);
    if (existingSlotSub) {
      // Change slot if different
      if (existingSlotSub.slotId !== slotId) {
        slotSubscriptionService.changeSlot(memberId, slotId, false);
      }
    } else {
      // Create new slot subscription
      slotSubscriptionService.create({
        memberId,
        slotId,
        startDate,
        isActive: true,
        isException: false,
      });
    }

    // Generate warning if using exception capacity
    const warning = isUsingExceptionCapacity
      ? `Warning: Normal capacity for "${slot.displayName}" is full. This member is being added using exception capacity (${currentSlotBookings + 1}/${totalCapacity} slots used).`
      : undefined;

    return { subscription: { ...subscription, invoiceId: invoice.id }, invoice, warning };
  },

  // Extend subscription
  extendSubscription: (
    subscriptionId: string,
    extensionDays: number,
    reason?: string
  ): MembershipSubscription | null => {
    const subscription = subscriptionService.getById(subscriptionId);
    if (!subscription) return null;

    const currentEnd = new Date(subscription.endDate);
    currentEnd.setDate(currentEnd.getDate() + extensionDays);
    const newEndDate = currentEnd.toISOString().split('T')[0];

    return subscriptionService.update(subscriptionId, {
      endDate: newEndDate,
      extensionDays: (subscription.extensionDays || 0) + extensionDays,
      notes: subscription.notes
        ? `${subscription.notes}\nExtended by ${extensionDays} days: ${reason || 'No reason provided'}`
        : `Extended by ${extensionDays} days: ${reason || 'No reason provided'}`,
    });
  },

  // Transfer member to different slot/batch
  transferSlot: (
    subscriptionId: string,
    newSlotId: string,
    effectiveDate: string,
    reason?: string
  ): { subscription: MembershipSubscription; warning?: string } => {
    const subscription = subscriptionService.getById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Only allow transfer for active or scheduled subscriptions
    if (!['active', 'scheduled'].includes(subscription.status)) {
      throw new Error('Can only transfer active or scheduled subscriptions');
    }

    const newSlot = slotService.getById(newSlotId);
    if (!newSlot) {
      throw new Error('Target slot not found');
    }

    if (subscription.slotId === newSlotId) {
      throw new Error('Member is already in this slot');
    }

    // Effective date must be within subscription period
    if (effectiveDate < subscription.startDate) {
      throw new Error('Effective date cannot be before subscription start date');
    }

    if (effectiveDate > subscription.endDate) {
      throw new Error('Effective date cannot be after subscription end date');
    }

    // Check capacity in new slot from effective date to subscription end date
    const capacityCheck = subscriptionService.checkSlotCapacity(
      newSlotId,
      effectiveDate,
      subscription.endDate
    );

    if (!capacityCheck.available) {
      throw new Error(`Cannot transfer: ${capacityCheck.message}`);
    }

    let warning: string | undefined;
    if (capacityCheck.isExceptionOnly) {
      warning = `Transfer will use exception capacity in "${newSlot.displayName}"`;
    }

    // Update subscription with new slot
    const oldSlot = slotService.getById(subscription.slotId);
    const noteText = `Batch transfer: ${oldSlot?.displayName || 'Unknown'} → ${newSlot.displayName} (effective ${effectiveDate})${reason ? `: ${reason}` : ''}`;

    const updatedSubscription = subscriptionService.update(subscriptionId, {
      slotId: newSlotId,
      notes: subscription.notes
        ? `${subscription.notes}\n${noteText}`
        : noteText,
    });

    if (!updatedSubscription) {
      throw new Error('Failed to update subscription');
    }

    // Also update member's assigned slot
    memberService.update(subscription.memberId, {
      assignedSlotId: newSlotId,
    });

    // Update slot subscription if exists
    const slotSub = slotSubscriptionService.getByMember(subscription.memberId);
    if (slotSub) {
      slotSubscriptionService.update(slotSub.id, {
        slotId: newSlotId,
      });
    }

    return { subscription: updatedSubscription, warning };
  },

  // Set extra days on a subscription (for compensations, holidays, etc.)
  // This actually extends the end date by the difference between new and old extra days
  setExtraDays: (
    subscriptionId: string,
    newDays: number,
    reason?: string
  ): MembershipSubscription => {
    const subscription = subscriptionService.getById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (newDays < 0) {
      throw new Error('Extra days cannot be negative');
    }

    const currentExtraDays = subscription.extraDays || 0;
    const daysDifference = newDays - currentExtraDays;

    // Calculate the new end date based on the difference
    const currentEnd = new Date(subscription.endDate);
    currentEnd.setDate(currentEnd.getDate() + daysDifference);
    const newEndDate = currentEnd.toISOString().split('T')[0];

    const updatedSubscription = subscriptionService.update(subscriptionId, {
      endDate: newEndDate,
      extraDays: newDays,
      extraDaysReason: reason || undefined,
    });

    if (!updatedSubscription) {
      throw new Error('Failed to update subscription');
    }

    return updatedSubscription;
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    getAll: async (): Promise<MembershipSubscription[]> => {
      if (isApiMode()) {
        return subscriptionsApi.getAll() as Promise<MembershipSubscription[]>;
      }
      return getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
    },

    getById: async (id: string): Promise<MembershipSubscription | null> => {
      if (isApiMode()) {
        return subscriptionsApi.getById(id) as Promise<MembershipSubscription | null>;
      }
      return getById<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, id);
    },

    create: async (data: Omit<MembershipSubscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<MembershipSubscription> => {
      if (isApiMode()) {
        return subscriptionsApi.create(data as Omit<MembershipSubscription, 'id' | 'createdAt' | 'updatedAt'>) as Promise<MembershipSubscription>;
      }
      return create<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, data);
    },

    update: async (id: string, data: Partial<MembershipSubscription>): Promise<MembershipSubscription | null> => {
      if (isApiMode()) {
        const updated = await subscriptionsApi.update(id, data as Partial<MembershipSubscription>) as MembershipSubscription | null;
        // Also update localStorage for UI consistency
        if (updated) {
          update<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, id, data);
        }
        return updated;
      }
      return update<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, id, data);
    },

    delete: async (id: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await subscriptionsApi.delete(id);
        return result.deleted;
      }
      return remove<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, id);
    },

    getByMember: async (memberId: string): Promise<MembershipSubscription[]> => {
      if (isApiMode()) {
        return subscriptionsApi.getByMember(memberId) as Promise<MembershipSubscription[]>;
      }
      const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
      return subscriptions
        .filter(s => s.memberId === memberId)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    },

    getActiveMemberSubscription: async (memberId: string): Promise<MembershipSubscription | null> => {
      if (isApiMode()) {
        return subscriptionsApi.getActiveMember(memberId) as Promise<MembershipSubscription | null>;
      }
      const subscriptions = await subscriptionService.async.getByMember(memberId);
      const today = new Date().toISOString().split('T')[0];
      return subscriptions.find(s =>
        s.status === 'active' &&
        s.startDate <= today &&
        s.endDate >= today
      ) || null;
    },

    getExpiringSoon: async (daysAhead: number = 7): Promise<MembershipSubscription[]> => {
      if (isApiMode()) {
        return subscriptionsApi.getExpiringSoon(daysAhead) as Promise<MembershipSubscription[]>;
      }
      const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const todayStr = today.toISOString().split('T')[0];
      const futureStr = futureDate.toISOString().split('T')[0];
      return subscriptions.filter(s =>
        s.status === 'active' &&
        s.endDate >= todayStr &&
        s.endDate <= futureStr
      );
    },

    hasActiveSubscription: async (memberId: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await subscriptionsApi.hasActiveSubscription(memberId);
        return result.hasActive;
      }
      return subscriptionService.getActiveMemberSubscription(memberId) !== null;
    },

    hasPendingRenewal: async (memberId: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await subscriptionsApi.hasPendingRenewal(memberId);
        return result.hasPendingRenewal;
      }
      return subscriptionService.hasPendingRenewal(memberId);
    },

    getActiveForSlotOnDate: async (slotId: string, date: string): Promise<MembershipSubscription[]> => {
      if (isApiMode()) {
        return subscriptionsApi.getActiveForSlotOnDate(slotId, date) as Promise<MembershipSubscription[]>;
      }
      const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
      return subscriptions.filter(s =>
        s.slotId === slotId &&
        s.status === 'active' &&
        s.startDate <= date &&
        s.endDate >= date
      );
    },

    checkSlotCapacity: async (slotId: string, startDate: string, endDate: string): Promise<{
      available: boolean;
      isExceptionOnly: boolean;
      currentBookings: number;
      normalCapacity: number;
      totalCapacity: number;
      message: string;
    }> => {
      if (isApiMode()) {
        return subscriptionsApi.checkSlotCapacity(slotId, startDate, endDate);
      }
      return subscriptionService.checkSlotCapacity(slotId, startDate, endDate);
    },

    // Async version of createWithInvoice that uses API data for capacity checks
    createWithInvoice: async (
      memberId: string,
      planId: string,
      slotId: string,
      startDate: string,
      discountAmount: number = 0,
      discountReason?: string,
      notes?: string,
      discountType?: 'fixed' | 'percentage',
      discountPercentage?: number
    ): Promise<{ subscription: MembershipSubscription; invoice: Invoice; warning?: string }> => {
      // In localStorage mode, use sync version
      if (!isApiMode()) {
        return subscriptionService.createWithInvoice(
          memberId, planId, slotId, startDate, discountAmount, discountReason, notes, discountType, discountPercentage
        );
      }

      // API mode - fetch fresh data from API for members/subscriptions
      // Plans and slots are synced at startup and rarely change, so use sync versions
      const plan = membershipPlanService.getById(planId);
      const slot = slotService.getById(slotId);
      const member = await memberService.async.getById(memberId);

      if (!plan) throw new Error('Plan not found');
      if (!member) throw new Error('Member not found');
      if (!slot) throw new Error('Session slot not found');

      // Calculate end date based on plan duration
      const endDate = calculateSubscriptionEndDate(startDate, plan.durationMonths);

      // Check for overlapping subscriptions using API data
      const existingSubscriptions = await subscriptionService.async.getByMember(memberId);
      const overlappingSubscription = existingSubscriptions.find(s => {
        if (!['active', 'pending', 'scheduled'].includes(s.status)) return false;
        return startDate <= s.endDate && endDate >= s.startDate;
      });

      if (overlappingSubscription) {
        const overlapPlan = membershipPlanService.getById(overlappingSubscription.planId);
        throw new Error(
          `Member already has an overlapping subscription (${overlapPlan?.name || 'Unknown'}) ` +
          `from ${overlappingSubscription.startDate} to ${overlappingSubscription.endDate}. ` +
          `Please choose a start date after ${overlappingSubscription.endDate}.`
        );
      }

      // Check if this is a renewal (member already has this slot assigned)
      const isRenewalInSameSlot = member.assignedSlotId === slotId;

      // Check slot capacity using API (fresh data)
      const capacityCheck = await subscriptionService.async.checkSlotCapacity(slotId, startDate, endDate);

      // For renewals in same slot, skip capacity check (member already occupies the slot)
      if (!isRenewalInSameSlot && !capacityCheck.available) {
        throw new Error(
          `Slot "${slot.displayName}" is completely full. ` +
          `Current bookings: ${capacityCheck.currentBookings}, Total capacity: ${capacityCheck.totalCapacity}. ` +
          `Cannot add more members to this slot.`
        );
      }

      const isUsingExceptionCapacity = !isRenewalInSameSlot && capacityCheck.isExceptionOnly;

      // Calculate amounts
      const originalAmount = plan.price;
      const payableAmount = Math.max(0, originalAmount - discountAmount);

      // Create subscription via API
      const subscription = await subscriptionService.async.create({
        memberId,
        planId,
        slotId,
        startDate,
        endDate,
        originalAmount,
        discountAmount,
        discountType,
        discountPercentage,
        discountReason,
        payableAmount,
        status: 'active',
        isExtension: false,
        paymentStatus: 'pending',
        notes,
      });

      // Create invoice via API
      const invoiceNumber = await invoiceService.async.generateInvoiceNumber();
      const invoice = await invoiceService.async.create({
        invoiceNumber,
        invoiceType: 'membership',
        memberId,
        subscriptionId: subscription.id,
        amount: originalAmount,
        discount: discountAmount,
        discountReason,
        totalAmount: payableAmount,
        amountPaid: 0,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: startDate,
        status: 'sent',
        items: [
          {
            description: `${plan.name} Membership (${plan.durationMonths} ${plan.durationMonths === 1 ? 'month' : 'months'}) - ${slot.displayName}`,
            quantity: 1,
            unitPrice: originalAmount,
            total: originalAmount,
          },
        ],
      });

      // Update member status and assigned slot via API
      await memberService.async.update(memberId, {
        status: 'active',
        assignedSlotId: slotId,
      });

      // Also update localStorage for UI consistency
      const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
      const memberIndex = members.findIndex(m => m.id === memberId);
      if (memberIndex >= 0) {
        members[memberIndex] = { ...members[memberIndex], status: 'active', assignedSlotId: slotId };
        saveAll(STORAGE_KEYS.MEMBERS, members);
      }

      // Update subscriptions in localStorage
      const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
      subscriptions.push(subscription);
      saveAll(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions);

      // Update invoices in localStorage
      const invoices = getAll<Invoice>(STORAGE_KEYS.INVOICES);
      invoices.push(invoice);
      saveAll(STORAGE_KEYS.INVOICES, invoices);

      return {
        subscription,
        invoice,
        warning: isUsingExceptionCapacity
          ? `Using exception capacity for slot "${slot.displayName}"`
          : undefined,
      };
    },
  },
};

// ============================================
// SESSION SLOT SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const slotService = {
  getAll: (): SessionSlot[] => {
    const slots = getAll<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS);
    if (slots.length > 0) return slots;
    // Initialize with default slots
    slotService.initializeDefaults();
    return getAll<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS);
  },

  getById: (id: string) => getById<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS, id),

  // Dual-mode update: updates localStorage AND immediately writes to API
  update: (id: string, data: Partial<SessionSlot>) =>
    updateDual<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS, id, data),

  getActive: (): SessionSlot[] => {
    return slotService.getAll().filter(s => s.isActive);
  },

  // Initialize default slots
  initializeDefaults: (): void => {
    const slots = getAll<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS);
    if (slots.length === 0) {
      DEFAULT_SESSION_SLOTS.forEach(slot => {
        create<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS, slot);
      });
    }
  },

  // Get slot availability for a date
  getSlotAvailability: (slotId: string, date: string): SlotAvailability => {
    const slot = slotService.getById(slotId);
    if (!slot) {
      throw new Error('Slot not found');
    }

    // Get active membership subscriptions for the specific date
    const membershipSubs = subscriptionService.getActiveForSlotOnDate(slotId, date);

    // Also check SlotSubscription for exception bookings (admin overrides)
    const slotSubscriptions = slotSubscriptionService.getActiveForSlot(slotId, date);
    const exceptionSubs = slotSubscriptions.filter(s => s.isException);

    // Get trial bookings for this date
    const trialBookings = trialBookingService.getBySlotAndDate(slotId, date);
    const activeTrials = trialBookings.filter(t =>
      ['pending', 'confirmed'].includes(t.status)
    );

    const regularBookings = membershipSubs.length;
    const exceptionBookings = exceptionSubs.length;
    const trialCount = activeTrials.length;

    const totalCapacity = slot.capacity + slot.exceptionCapacity;
    const availableRegular = Math.max(0, slot.capacity - regularBookings - trialCount);
    const availableException = Math.max(0, slot.exceptionCapacity - exceptionBookings);

    return {
      slotId,
      date,
      regularBookings,
      exceptionBookings,
      trialBookings: trialCount,
      totalCapacity,
      availableRegular,
      availableException,
      isFull: availableRegular <= 0 && availableException <= 0,
    };
  },

  // Get all slots availability
  getAllSlotsAvailability: (date: string): SlotAvailability[] => {
    const slots = slotService.getActive();
    return slots.map(slot => slotService.getSlotAvailability(slot.id, date));
  },

  // Check if slot has capacity
  hasCapacity: (slotId: string, date: string, useException: boolean = false): boolean => {
    const availability = slotService.getSlotAvailability(slotId, date);
    if (useException) {
      return availability.availableException > 0;
    }
    return availability.availableRegular > 0;
  },

  // Update slot capacity
  updateCapacity: (slotId: string, capacity: number, exceptionCapacity: number): SessionSlot | null => {
    return slotService.update(slotId, { capacity, exceptionCapacity });
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    getAll: async (): Promise<SessionSlot[]> => {
      if (isApiMode()) {
        return slotsApi.getAll() as Promise<SessionSlot[]>;
      }
      return slotService.getAll();
    },

    getById: async (id: string): Promise<SessionSlot | null> => {
      if (isApiMode()) {
        return slotsApi.getById(id) as Promise<SessionSlot | null>;
      }
      return getById<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS, id);
    },

    update: async (id: string, data: Partial<SessionSlot>): Promise<SessionSlot | null> => {
      if (isApiMode()) {
        return slotsApi.update(id, data as Partial<SessionSlot>) as Promise<SessionSlot | null>;
      }
      return update<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS, id, data);
    },

    getActive: async (): Promise<SessionSlot[]> => {
      if (isApiMode()) {
        return slotsApi.getActive() as Promise<SessionSlot[]>;
      }
      return slotService.getActive();
    },

    getSlotAvailability: async (slotId: string, date: string): Promise<SlotAvailability> => {
      if (isApiMode()) {
        return slotsApi.getAvailability(slotId, date) as Promise<SlotAvailability>;
      }
      return slotService.getSlotAvailability(slotId, date);
    },

    getAllSlotsAvailability: async (date: string): Promise<SlotAvailability[]> => {
      if (isApiMode()) {
        return slotsApi.getAllAvailability(date) as Promise<SlotAvailability[]>;
      }
      return slotService.getAllSlotsAvailability(date);
    },

    hasCapacity: async (slotId: string, date: string, useException: boolean = false): Promise<boolean> => {
      if (isApiMode()) {
        const result = await slotsApi.hasCapacity(slotId, date, useException);
        return result.hasCapacity;
      }
      return slotService.hasCapacity(slotId, date, useException);
    },

    updateCapacity: async (slotId: string, capacity: number, exceptionCapacity: number): Promise<SessionSlot | null> => {
      if (isApiMode()) {
        return slotsApi.updateCapacity(slotId, capacity, exceptionCapacity) as Promise<SessionSlot | null>;
      }
      return slotService.updateCapacity(slotId, capacity, exceptionCapacity);
    },
  },
};

// ============================================
// SLOT SUBSCRIPTION SERVICE
// ============================================

export const slotSubscriptionService = {
  getAll: () => getAll<SlotSubscription>(STORAGE_KEYS.SLOT_SUBSCRIPTIONS),
  getById: (id: string) => getById<SlotSubscription>(STORAGE_KEYS.SLOT_SUBSCRIPTIONS, id),
  // Note: SlotSubscription does not have its own API endpoint yet - only syncs via localStorage
  // TODO: Add slot-subscriptions API endpoint for full API mode support
  create: (data: Omit<SlotSubscription, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<SlotSubscription>(STORAGE_KEYS.SLOT_SUBSCRIPTIONS, data),
  update: (id: string, data: Partial<SlotSubscription>) =>
    update<SlotSubscription>(STORAGE_KEYS.SLOT_SUBSCRIPTIONS, id, data),
  delete: (id: string) => remove<SlotSubscription>(STORAGE_KEYS.SLOT_SUBSCRIPTIONS, id),

  getByMember: (memberId: string): SlotSubscription | null => {
    const subscriptions = getAll<SlotSubscription>(STORAGE_KEYS.SLOT_SUBSCRIPTIONS);
    return subscriptions.find(s => s.memberId === memberId && s.isActive) || null;
  },

  getActiveForSlot: (slotId: string, date?: string): SlotSubscription[] => {
    const subscriptions = getAll<SlotSubscription>(STORAGE_KEYS.SLOT_SUBSCRIPTIONS);
    return subscriptions.filter(s => {
      if (s.slotId !== slotId || !s.isActive) return false;
      // If date is provided, check if subscription covers that date
      if (date) {
        if (s.startDate && s.startDate > date) return false;
        if (s.endDate && s.endDate < date) return false;
      }
      return true;
    });
  },

  // Subscribe member to slot
  subscribe: (
    memberId: string,
    slotId: string,
    isException: boolean = false,
    notes?: string
  ): SlotSubscription => {
    // Validate member doesn't already have active slot
    const existing = slotSubscriptionService.getByMember(memberId);
    if (existing) {
      throw new Error('Member already has an assigned slot. Deactivate first.');
    }

    // Validate capacity
    const today = new Date().toISOString().split('T')[0];
    if (!slotService.hasCapacity(slotId, today, isException)) {
      throw new Error(isException ? 'Exception capacity full' : 'Slot is at capacity');
    }

    const subscription = slotSubscriptionService.create({
      memberId,
      slotId,
      startDate: today,
      isActive: true,
      isException,
      notes,
    });

    // Update member's assigned slot
    memberService.update(memberId, { assignedSlotId: slotId });

    return subscription;
  },

  // Change member's slot
  changeSlot: (
    memberId: string,
    newSlotId: string,
    isException: boolean = false
  ): SlotSubscription => {
    // Deactivate current slot
    slotSubscriptionService.deactivate(memberId);

    // Subscribe to new slot
    return slotSubscriptionService.subscribe(memberId, newSlotId, isException);
  },

  // Deactivate slot subscription
  deactivate: (memberId: string): void => {
    const subscription = slotSubscriptionService.getByMember(memberId);
    if (subscription) {
      slotSubscriptionService.update(subscription.id, {
        isActive: false,
        endDate: new Date().toISOString().split('T')[0],
      });
    }
    // Note: We don't clear member.assignedSlotId to retain slot on membership expiry
  },
};

// ============================================
// INVOICE SERVICE
// ============================================

export const invoiceService = {
  // Synchronous methods - dual-mode (localStorage + API queue)
  getAll: () => getAll<Invoice>(STORAGE_KEYS.INVOICES),
  getById: (id: string) => getById<Invoice>(STORAGE_KEYS.INVOICES, id),
  create: (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Invoice>(STORAGE_KEYS.INVOICES, data),
  update: (id: string, data: Partial<Invoice>) =>
    updateDual<Invoice>(STORAGE_KEYS.INVOICES, id, data),
  delete: (id: string) => removeDual<Invoice>(STORAGE_KEYS.INVOICES, id),

  getByMember: (memberId: string): Invoice[] => {
    const invoices = getAll<Invoice>(STORAGE_KEYS.INVOICES);
    return invoices
      .filter(i => i.memberId === memberId)
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  },

  getPending: (): Invoice[] => {
    const invoices = getAll<Invoice>(STORAGE_KEYS.INVOICES);
    return invoices.filter(i => ['sent', 'partially-paid', 'overdue'].includes(i.status));
  },

  getOverdue: (): Invoice[] => {
    const invoices = getAll<Invoice>(STORAGE_KEYS.INVOICES);
    const today = new Date().toISOString().split('T')[0];
    return invoices.filter(i =>
      ['sent', 'partially-paid'].includes(i.status) && i.dueDate < today
    );
  },

  generateInvoiceNumber: (): string => {
    const settings = settingsService.get();
    const invoices = getAll<Invoice>(STORAGE_KEYS.INVOICES);
    const prefix = settings?.invoicePrefix || 'INV';
    const startNumber = settings?.invoiceStartNumber || 1;

    // Find the highest existing invoice number
    let maxNumber = 0;
    const prefixWithDash = prefix + '-';
    invoices.forEach(inv => {
      if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefixWithDash)) {
        const numPart = parseInt(inv.invoiceNumber.substring(prefixWithDash.length), 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    });

    // Next number is max of (highest existing, startNumber - 1) + 1
    const nextNumber = Math.max(maxNumber, startNumber - 1) + 1;
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    getAll: async (): Promise<Invoice[]> => {
      if (isApiMode()) {
        return invoicesApi.getAll() as Promise<Invoice[]>;
      }
      return getAll<Invoice>(STORAGE_KEYS.INVOICES);
    },

    getById: async (id: string): Promise<Invoice | null> => {
      if (isApiMode()) {
        return invoicesApi.getById(id) as Promise<Invoice | null>;
      }
      return getById<Invoice>(STORAGE_KEYS.INVOICES, id);
    },

    create: async (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> => {
      if (isApiMode()) {
        const invoice = await invoicesApi.create(data as Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) as Invoice;
        // Also save to localStorage for UI consistency
        const invoices = getAll<Invoice>(STORAGE_KEYS.INVOICES);
        invoices.push(invoice);
        saveAll(STORAGE_KEYS.INVOICES, invoices);
        return invoice;
      }
      return create<Invoice>(STORAGE_KEYS.INVOICES, data);
    },

    update: async (id: string, data: Partial<Invoice>): Promise<Invoice | null> => {
      if (isApiMode()) {
        const updated = await invoicesApi.update(id, data as Partial<Invoice>) as Invoice | null;
        // Also update localStorage for UI consistency
        if (updated) {
          update<Invoice>(STORAGE_KEYS.INVOICES, id, data);
        }
        return updated;
      }
      return update<Invoice>(STORAGE_KEYS.INVOICES, id, data);
    },

    delete: async (id: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await invoicesApi.delete(id);
        return result.deleted;
      }
      return remove<Invoice>(STORAGE_KEYS.INVOICES, id);
    },

    getByMember: async (memberId: string): Promise<Invoice[]> => {
      if (isApiMode()) {
        return invoicesApi.getByMember(memberId) as Promise<Invoice[]>;
      }
      const invoices = getAll<Invoice>(STORAGE_KEYS.INVOICES);
      return invoices
        .filter(i => i.memberId === memberId)
        .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    },

    getPending: async (): Promise<Invoice[]> => {
      if (isApiMode()) {
        return invoicesApi.getPending() as Promise<Invoice[]>;
      }
      const invoices = getAll<Invoice>(STORAGE_KEYS.INVOICES);
      return invoices.filter(i => ['sent', 'partially-paid', 'overdue'].includes(i.status));
    },

    getOverdue: async (): Promise<Invoice[]> => {
      if (isApiMode()) {
        return invoicesApi.getOverdue() as Promise<Invoice[]>;
      }
      return invoiceService.getOverdue();
    },

    generateInvoiceNumber: async (): Promise<string> => {
      if (isApiMode()) {
        const result = await invoicesApi.generateNumber();
        return result.invoiceNumber;
      }
      return invoiceService.generateInvoiceNumber();
    },
  },
};

// ============================================
// PAYMENT SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const paymentService = {
  // Synchronous methods - dual-mode (localStorage + API queue)
  getAll: () => getAll<Payment>(STORAGE_KEYS.PAYMENTS),
  getById: (id: string) => getById<Payment>(STORAGE_KEYS.PAYMENTS, id),
  create: (data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Payment>(STORAGE_KEYS.PAYMENTS, data),
  update: (id: string, data: Partial<Payment>) =>
    updateDual<Payment>(STORAGE_KEYS.PAYMENTS, id, data),
  delete: (id: string) => removeDual<Payment>(STORAGE_KEYS.PAYMENTS, id),

  getByInvoice: (invoiceId: string): Payment[] => {
    const payments = getAll<Payment>(STORAGE_KEYS.PAYMENTS);
    return payments
      .filter(p => p.invoiceId === invoiceId)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  },

  getByMember: (memberId: string): Payment[] => {
    const payments = getAll<Payment>(STORAGE_KEYS.PAYMENTS);
    return payments
      .filter(p => p.memberId === memberId)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  },

  generateReceiptNumber: (): string => {
    const settings = settingsService.get();
    const payments = getAll<Payment>(STORAGE_KEYS.PAYMENTS);
    const prefix = settings?.receiptPrefix || 'RCP';
    const startNumber = settings?.receiptStartNumber || 1;

    // Find the highest existing receipt number
    let maxNumber = 0;
    const prefixWithDash = prefix + '-';
    payments.forEach(pmt => {
      if (pmt.receiptNumber && pmt.receiptNumber.startsWith(prefixWithDash)) {
        const numPart = parseInt(pmt.receiptNumber.substring(prefixWithDash.length), 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    });

    // Next number is max of (highest existing, startNumber - 1) + 1
    const nextNumber = Math.max(maxNumber, startNumber - 1) + 1;
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  },

  // Record payment and update invoice
  recordPayment: (
    invoiceId: string,
    amount: number,
    paymentMethod: Payment['paymentMethod'],
    paymentDate?: string,
    transactionReference?: string,
    notes?: string
  ): Payment => {
    const invoice = invoiceService.getById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const payment = paymentService.create({
      invoiceId,
      memberId: invoice.memberId,
      amount,
      paymentMethod,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      transactionReference,
      status: 'completed',
      receiptNumber: paymentService.generateReceiptNumber(),
      notes,
    });

    // Update invoice - ensure numeric comparison (API may return strings)
    const totalPaid = Number(invoice.amountPaid || 0) + amount;
    const invoiceTotal = Number(invoice.totalAmount || 0);
    const newStatus = totalPaid >= invoiceTotal ? 'paid' : 'partially-paid';

    invoiceService.update(invoiceId, {
      amountPaid: totalPaid,
      status: newStatus,
      paidDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
      paymentMethod,
      paymentReference: transactionReference,
    });

    // If invoice is linked to subscription, update subscription payment status
    if (invoice.subscriptionId) {
      subscriptionService.update(invoice.subscriptionId, {
        paymentStatus: newStatus === 'paid' ? 'paid' : 'partial',
      });
    }

    return payment;
  },

  // Get revenue for date range
  getRevenue: (startDate: string, endDate: string): number => {
    const payments = getAll<Payment>(STORAGE_KEYS.PAYMENTS);
    return payments
      .filter(p =>
        p.status === 'completed' &&
        p.paymentDate >= startDate &&
        p.paymentDate <= endDate
      )
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    getAll: async (): Promise<Payment[]> => {
      if (isApiMode()) {
        return paymentsApi.getAll() as Promise<Payment[]>;
      }
      return getAll<Payment>(STORAGE_KEYS.PAYMENTS);
    },

    getById: async (id: string): Promise<Payment | null> => {
      if (isApiMode()) {
        return paymentsApi.getById(id) as Promise<Payment | null>;
      }
      return getById<Payment>(STORAGE_KEYS.PAYMENTS, id);
    },

    create: async (data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> => {
      if (isApiMode()) {
        return paymentsApi.create(data as Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) as Promise<Payment>;
      }
      return create<Payment>(STORAGE_KEYS.PAYMENTS, data);
    },

    update: async (id: string, data: Partial<Payment>): Promise<Payment | null> => {
      if (isApiMode()) {
        return paymentsApi.update(id, data as Partial<Payment>) as Promise<Payment | null>;
      }
      return update<Payment>(STORAGE_KEYS.PAYMENTS, id, data);
    },

    delete: async (id: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await paymentsApi.delete(id);
        return result.deleted;
      }
      return remove<Payment>(STORAGE_KEYS.PAYMENTS, id);
    },

    getByInvoice: async (invoiceId: string): Promise<Payment[]> => {
      if (isApiMode()) {
        return paymentsApi.getByInvoice(invoiceId) as Promise<Payment[]>;
      }
      const payments = getAll<Payment>(STORAGE_KEYS.PAYMENTS);
      return payments
        .filter(p => p.invoiceId === invoiceId)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    },

    getByMember: async (memberId: string): Promise<Payment[]> => {
      if (isApiMode()) {
        return paymentsApi.getByMember(memberId) as Promise<Payment[]>;
      }
      const payments = getAll<Payment>(STORAGE_KEYS.PAYMENTS);
      return payments
        .filter(p => p.memberId === memberId)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    },

    generateReceiptNumber: async (): Promise<string> => {
      if (isApiMode()) {
        const result = await paymentsApi.generateReceiptNumber();
        return result.receiptNumber;
      }
      return paymentService.generateReceiptNumber();
    },

    getRevenue: async (startDate: string, endDate: string): Promise<number> => {
      if (isApiMode()) {
        const result = await paymentsApi.getRevenue(startDate, endDate);
        return Number(result.revenue || 0);
      }
      return paymentService.getRevenue(startDate, endDate);
    },

    // Note: recordPayment is complex business logic that stays in frontend
    recordPayment: async (
      invoiceId: string,
      amount: number,
      paymentMethod: Payment['paymentMethod'],
      paymentDate?: string,
      transactionReference?: string,
      notes?: string
    ): Promise<Payment> => {
      if (isApiMode()) {
        // In API mode, still perform business logic client-side for consistency
        const invoice = await invoiceService.async.getById(invoiceId);
        if (!invoice) throw new Error('Invoice not found');

        const receiptNumber = await paymentService.async.generateReceiptNumber();
        const payment = await paymentService.async.create({
          invoiceId,
          memberId: invoice.memberId,
          amount,
          paymentMethod,
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
          transactionReference,
          status: 'completed',
          receiptNumber,
          notes,
        });

        // Update invoice via API - ensure numeric comparison (API may return strings)
        const totalPaid = Number(invoice.amountPaid || 0) + amount;
        const invoiceTotal = Number(invoice.totalAmount || 0);
        const newStatus = totalPaid >= invoiceTotal ? 'paid' : 'partially-paid';
        await invoicesApi.updatePaymentStatus(invoiceId, {
          amountPaid: totalPaid,
          status: newStatus,
          paymentMethod,
          paymentReference: transactionReference,
          paidDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
        });

        // Update subscription if linked
        if (invoice.subscriptionId) {
          await subscriptionService.async.update(invoice.subscriptionId, {
            paymentStatus: newStatus === 'paid' ? 'paid' : 'partial',
          });
        }

        return payment;
      }
      // localStorage mode - use synchronous version
      return paymentService.recordPayment(invoiceId, amount, paymentMethod, paymentDate, transactionReference, notes);
    },
  },
};

// ============================================
// TRIAL BOOKING SERVICE
// ============================================

export const trialBookingService = {
  // Synchronous methods - dual-mode (localStorage + API queue)
  getAll: () => getAll<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS),
  getById: (id: string) => getById<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, id),
  create: (data: Omit<TrialBooking, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, data),
  update: (id: string, data: Partial<TrialBooking>) =>
    updateDual<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, id, data),
  delete: (id: string) => removeDual<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, id),

  getByLead: (leadId: string): TrialBooking[] => {
    const bookings = getAll<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS);
    return bookings.filter(b => b.leadId === leadId);
  },

  getBySlotAndDate: (slotId: string, date: string): TrialBooking[] => {
    const bookings = getAll<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS);
    return bookings.filter(b => b.slotId === slotId && b.date === date);
  },

  getUpcoming: (): TrialBooking[] => {
    const bookings = getAll<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS);
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(b =>
      b.date >= today && ['pending', 'confirmed'].includes(b.status)
    );
  },

  // Book trial session
  bookTrial: (
    leadId: string,
    slotId: string,
    date: string,
    isException: boolean = false
  ): TrialBooking => {
    const lead = leadService.getById(leadId);
    if (!lead) throw new Error('Lead not found');

    // Check if lead already had maximum trials
    const existingTrials = trialBookingService.getByLead(leadId);
    const settings = settingsService.getOrDefault();
    const completedTrials = existingTrials.filter(t =>
      ['attended', 'no-show'].includes(t.status)
    );
    if (completedTrials.length >= settings.maxTrialsPerPerson) {
      throw new Error('Maximum trial sessions reached');
    }

    // Check for overlapping trial booking on the same date
    const activeTrialsOnDate = existingTrials.filter(t =>
      t.date === date && ['pending', 'confirmed'].includes(t.status)
    );
    if (activeTrialsOnDate.length > 0) {
      throw new Error('A trial session is already booked for this date');
    }

    // Check if lead was already converted to member with active subscription
    // Find member by email (lead's email matches member's email after conversion)
    const allMembers = memberService.getAll();
    const matchingMember = allMembers.find(m => m.email === lead.email);
    if (matchingMember) {
      const activeSubscription = subscriptionService.getActiveMemberSubscription(matchingMember.id);
      if (activeSubscription && activeSubscription.startDate <= date && activeSubscription.endDate >= date) {
        throw new Error('This person already has an active membership. Trial booking not allowed.');
      }
    }

    // Check capacity
    if (!slotService.hasCapacity(slotId, date, isException)) {
      throw new Error(isException ? 'Exception capacity full' : 'Slot is full for this date');
    }

    // Check if it's a working day (Monday-Friday)
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new Error('Sessions only available Monday to Friday');
    }

    const booking = trialBookingService.create({
      leadId,
      slotId,
      date,
      status: 'confirmed',
      isException,
      confirmationSent: false,
      reminderSent: false,
    });

    // Update lead status
    leadService.update(leadId, {
      status: 'trial-scheduled',
      trialDate: date,
      trialSlotId: slotId,
      trialStatus: 'scheduled',
    });

    return booking;
  },

  // Mark trial as attended
  markAttended: (bookingId: string): TrialBooking | null => {
    const booking = trialBookingService.getById(bookingId);
    if (!booking) return null;

    const updated = trialBookingService.update(bookingId, { status: 'attended' });

    // Update lead
    leadService.update(booking.leadId, {
      status: 'trial-completed',
      trialStatus: 'attended',
    });

    return updated;
  },

  // Mark trial as no-show
  markNoShow: (bookingId: string): TrialBooking | null => {
    const booking = trialBookingService.getById(bookingId);
    if (!booking) return null;

    const updated = trialBookingService.update(bookingId, { status: 'no-show' });

    // Update lead
    leadService.update(booking.leadId, {
      status: 'follow-up',
      trialStatus: 'no-show',
    });

    return updated;
  },
};

// ============================================
// SETTINGS SERVICE
// In API mode: Database is the SINGLE source of truth
// localStorage is only used as a cache, populated by syncFromApi on startup
// ============================================

export const settingsService = {
  // Get settings - reads from localStorage cache (populated from DB on startup)
  get: (): StudioSettings | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // BLOCKING PRODUCTION BUG FIX: Settings MUST be saved to database
  // This method now returns a Promise and WAITS for API response
  // The SettingsPage MUST use saveAsync() instead for proper error handling
  save: (settings: StudioSettings): void => {
    // In localStorage mode, just save locally
    if (!isApiMode()) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return;
    }

    // In API mode: Save to BOTH database AND localStorage cache
    // Note: This is fire-and-forget - use saveAsync() for proper error handling
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const apiKey = import.meta.env.VITE_API_KEY || '';

    setWaitingCursor(true);

    fetch(`${baseUrl}/settings?action=save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(settings),
    })
      .then(response => {
        if (!response.ok) {
          console.error('[Settings] API save failed:', response.status);
          throw new Error('Failed to save settings to database');
        }
        console.log('[Settings] Successfully saved to database');
      })
      .catch(error => {
        console.error('[Settings] Save error:', error);
      })
      .finally(() => {
        setWaitingCursor(false);
      });
  },

  // ASYNC SAVE - Use this in SettingsPage for proper error handling
  // This WAITS for the database save and throws on failure
  saveAsync: async (settings: StudioSettings): Promise<void> => {
    console.log('[Settings] saveAsync called, isApiMode:', isApiMode());

    if (!isApiMode()) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return;
    }

    // Use the settingsApi from api.ts for consistency
    setWaitingCursor(true);

    try {
      console.log('[Settings] Calling settingsApi.save()...');
      const result = await settingsApi.save(settings);
      console.log('[Settings] API response:', result);

      // Update localStorage cache after successful DB save
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      console.log('[Settings] Successfully saved to database and updated cache');
    } catch (error) {
      console.error('[Settings] API save failed:', error);
      throw error;
    } finally {
      setWaitingCursor(false);
    }
  },

  getOrDefault: (): StudioSettings => {
    const existing = settingsService.get();
    if (existing) return existing;

    // In API mode, don't auto-save defaults - they should come from DB
    if (isApiMode()) {
      return DEFAULT_STUDIO_SETTINGS;
    }

    settingsService.save(DEFAULT_STUDIO_SETTINGS);
    return DEFAULT_STUDIO_SETTINGS;
  },

  // ASYNC version that properly handles API mode
  updatePartialAsync: async (updates: Partial<StudioSettings>): Promise<StudioSettings> => {
    const current = settingsService.getOrDefault();
    const updated = { ...current, ...updates };
    await settingsService.saveAsync(updated);
    return updated;
  },

  // Legacy sync version - use updatePartialAsync in SettingsPage instead
  updatePartial: (updates: Partial<StudioSettings>): StudioSettings => {
    const current = settingsService.getOrDefault();
    const updated = { ...current, ...updates };
    settingsService.save(updated);
    return updated;
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    get: async (): Promise<StudioSettings | null> => {
      if (isApiMode()) {
        return settingsApi.get() as Promise<StudioSettings | null>;
      }
      return settingsService.get();
    },

    save: async (settings: StudioSettings): Promise<void> => {
      if (isApiMode()) {
        await settingsApi.save(settings);
        // Update localStorage cache
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        return;
      }
      settingsService.save(settings);
    },

    getOrDefault: async (): Promise<StudioSettings> => {
      if (isApiMode()) {
        const settings = await settingsApi.get() as StudioSettings | null;
        return settings || DEFAULT_STUDIO_SETTINGS;
      }
      return settingsService.getOrDefault();
    },

    updatePartial: async (updates: Partial<StudioSettings>): Promise<StudioSettings> => {
      if (isApiMode()) {
        return settingsApi.updatePartial(updates) as Promise<StudioSettings>;
      }
      return settingsService.updatePartial(updates);
    },
  },
};

// ============================================
// AUTH SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

interface AuthState {
  isAuthenticated: boolean;
  loginTime: string;
}

export const authService = {
  login: (password: string): boolean => {
    const settings = settingsService.getOrDefault();
    const adminPassword = settings.adminPassword || 'admin123';

    if (password === adminPassword) {
      const authState: AuthState = {
        isAuthenticated: true,
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(authState));
      return true;
    }
    return false;
  },

  logout: (): void => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },

  isAuthenticated: (): boolean => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (!data) return false;
      const auth: AuthState = JSON.parse(data);
      return auth.isAuthenticated === true;
    } catch {
      return false;
    }
  },

  changePassword: (newPassword: string): void => {
    settingsService.updatePartial({ adminPassword: newPassword });
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    login: async (password: string): Promise<boolean> => {
      if (isApiMode()) {
        return authApi.login(password);
      }
      return authService.login(password);
    },

    logout: async (): Promise<void> => {
      if (isApiMode()) {
        await authApi.logout();
        return;
      }
      authService.logout();
    },

    isAuthenticated: async (): Promise<boolean> => {
      if (isApiMode()) {
        return authApi.check();
      }
      return authService.isAuthenticated();
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await authApi.changePassword(currentPassword, newPassword);
        return result.success;
      }
      // localStorage mode - verify current password first
      const settings = settingsService.getOrDefault();
      if (settings.adminPassword !== currentPassword && currentPassword !== 'admin123') {
        return false;
      }
      authService.changePassword(newPassword);
      return true;
    },
  },
};

// ============================================
// BACKUP SERVICE
// ============================================

export const backupService = {
  exportAll: (): string => {
    const data = {
      members: memberService.getAll(),
      leads: leadService.getAll(),
      membershipPlans: membershipPlanService.getAll(),
      subscriptions: subscriptionService.getAll(),
      sessionSlots: slotService.getAll(),
      slotSubscriptions: slotSubscriptionService.getAll(),
      invoices: invoiceService.getAll(),
      payments: paymentService.getAll(),
      trialBookings: trialBookingService.getAll(),
      settings: settingsService.get(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    return JSON.stringify(data, null, 2);
  },

  importAll: (jsonData: string): void => {
    try {
      const data = JSON.parse(jsonData);

      if (data.members) saveAll(STORAGE_KEYS.MEMBERS, data.members);
      if (data.leads) saveAll(STORAGE_KEYS.LEADS, data.leads);
      if (data.membershipPlans) saveAll(STORAGE_KEYS.MEMBERSHIP_PLANS, data.membershipPlans);
      if (data.subscriptions) saveAll(STORAGE_KEYS.SUBSCRIPTIONS, data.subscriptions);
      if (data.sessionSlots) saveAll(STORAGE_KEYS.SESSION_SLOTS, data.sessionSlots);
      if (data.slotSubscriptions) saveAll(STORAGE_KEYS.SLOT_SUBSCRIPTIONS, data.slotSubscriptions);
      if (data.invoices) saveAll(STORAGE_KEYS.INVOICES, data.invoices);
      if (data.payments) saveAll(STORAGE_KEYS.PAYMENTS, data.payments);
      if (data.trialBookings) saveAll(STORAGE_KEYS.TRIAL_BOOKINGS, data.trialBookings);
      if (data.settings) settingsService.save(data.settings);
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Invalid backup file format');
    }
  },

  clearAll: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
};

// ============================================
// INITIALIZATION
// In API mode, the database schema includes default data
// ============================================

export function initializeStorage(): void {
  // Skip initialization in API mode - database has default data in schema
  if (isApiMode()) {
    console.log('Storage initialization skipped in API mode - using database defaults');
    return;
  }

  // localStorage mode: Initialize default settings
  settingsService.getOrDefault();

  // Initialize default slots
  slotService.initializeDefaults();

  // Initialize default membership plans
  membershipPlanService.initializeDefaults();
}

// ============================================
// SEED DATA
// Automatically disabled in API mode (database has its own data)
// ============================================

const SEED_DATA_KEY = 'yoga_studio_seed_initialized';

export function seedDemoData(): void {
  // IMPORTANT: Disable seeding in API mode - database manages its own data
  if (isApiMode()) {
    console.log('Seed data disabled in API mode - using database');
    return;
  }

  // Check if seed data was already added
  if (localStorage.getItem(SEED_DATA_KEY)) {
    console.log('Seed data already exists');
    return;
  }

  // Make sure defaults are initialized first
  initializeStorage();

  // Get the slots and plans
  const slots = slotService.getAll();
  const plans = membershipPlanService.getAll();

  if (slots.length === 0 || plans.length === 0) {
    console.error('Cannot seed data: slots or plans not initialized');
    return;
  }

  const monthlyPlan = plans.find(p => p.type === 'monthly');
  const quarterlyPlan = plans.find(p => p.type === 'quarterly');

  if (!monthlyPlan || !quarterlyPlan) {
    console.error('Cannot seed data: required plans not found');
    return;
  }

  // Sample member data
  const sampleMembers = [
    { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@email.com', phone: '9876543210', gender: 'female' as const },
    { firstName: 'Rahul', lastName: 'Verma', email: 'rahul.verma@email.com', phone: '9876543211', gender: 'male' as const },
    { firstName: 'Anita', lastName: 'Patel', email: 'anita.patel@email.com', phone: '9876543212', gender: 'female' as const },
    { firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@email.com', phone: '9876543213', gender: 'male' as const },
    { firstName: 'Meera', lastName: 'Reddy', email: 'meera.reddy@email.com', phone: '9876543214', gender: 'female' as const },
    { firstName: 'Arjun', lastName: 'Kumar', email: 'arjun.kumar@email.com', phone: '9876543215', gender: 'male' as const },
    { firstName: 'Kavita', lastName: 'Nair', email: 'kavita.nair@email.com', phone: '9876543216', gender: 'female' as const },
    { firstName: 'Suresh', lastName: 'Gupta', email: 'suresh.gupta@email.com', phone: '9876543217', gender: 'male' as const },
    { firstName: 'Deepa', lastName: 'Menon', email: 'deepa.menon@email.com', phone: '9876543218', gender: 'female' as const },
    { firstName: 'Amit', lastName: 'Joshi', email: 'amit.joshi@email.com', phone: '9876543219', gender: 'male' as const },
    { firstName: 'Sunita', lastName: 'Rao', email: 'sunita.rao@email.com', phone: '9876543220', gender: 'female' as const },
    { firstName: 'Rajesh', lastName: 'Iyer', email: 'rajesh.iyer@email.com', phone: '9876543221', gender: 'male' as const },
  ];

  // Distribute members across slots (3 per slot for 4 slots)
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Calculate subscription dates - start from 15 days ago to have some attendance history
  const subscriptionStart = new Date(now);
  subscriptionStart.setDate(subscriptionStart.getDate() - 15);
  const startDate = subscriptionStart.toISOString().split('T')[0];

  // End date based on monthly plan (30 days from start)
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);
  const endDate = subscriptionEnd.toISOString().split('T')[0];

  // Quarterly end date (90 days from start)
  const quarterlyEnd = new Date(subscriptionStart);
  quarterlyEnd.setDate(quarterlyEnd.getDate() + 90);
  const quarterlyEndDate = quarterlyEnd.toISOString().split('T')[0];

  sampleMembers.forEach((memberData, index) => {
    // Assign to slots in round-robin (3 members per slot)
    const slotIndex = Math.floor(index / 3);
    const slot = slots[slotIndex % slots.length];

    // Alternate between monthly and quarterly plans
    const plan = index % 3 === 0 ? quarterlyPlan : monthlyPlan;
    const subEndDate = plan.type === 'quarterly' ? quarterlyEndDate : endDate;

    // Create member
    const member = memberService.create({
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone,
      gender: memberData.gender,
      status: 'active',
      source: 'referral',
      assignedSlotId: slot.id,
      classesAttended: 0,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create subscription with invoice
    try {
      subscriptionService.createWithInvoice(
        member.id,
        plan.id,
        slot.id,
        startDate,
        0, // no discount
        undefined
      );
    } catch (err) {
      console.warn(`Could not create subscription for ${member.firstName}: ${err}`);
    }

    // Mark some attendance for the past days (random pattern)
    const pastDays = 15;
    for (let d = pastDays; d >= 1; d--) {
      const attendanceDate = new Date(now);
      attendanceDate.setDate(attendanceDate.getDate() - d);

      // Skip weekends
      const dayOfWeek = attendanceDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = attendanceDate.toISOString().split('T')[0];

      // Random attendance: ~70-90% present rate
      const isPresent = Math.random() < (0.7 + (index % 3) * 0.1);

      if (isPresent) {
        try {
          attendanceService.markAttendance(member.id, slot.id, dateStr, 'present');
        } catch (err) {
          // Ignore errors for past attendance
        }
      }
    }
  });

  // ============================================
  // CREATE MEMBERS WITH EXPIRING SUBSCRIPTIONS (for testing renewal)
  // ============================================
  const expiringMembers = [
    { firstName: 'Sanjay', lastName: 'Chopra', email: 'sanjay.chopra@email.com', phone: '9876543240', gender: 'male' as const, daysToExpiry: 1 },
    { firstName: 'Lakshmi', lastName: 'Pillai', email: 'lakshmi.pillai@email.com', phone: '9876543241', gender: 'female' as const, daysToExpiry: 2 },
    { firstName: 'Manoj', lastName: 'Tiwari', email: 'manoj.tiwari@email.com', phone: '9876543242', gender: 'male' as const, daysToExpiry: 3 },
    { firstName: 'Rekha', lastName: 'Desai', email: 'rekha.desai@email.com', phone: '9876543243', gender: 'female' as const, daysToExpiry: 4 },
    { firstName: 'Vinod', lastName: 'Saxena', email: 'vinod.saxena@email.com', phone: '9876543244', gender: 'male' as const, daysToExpiry: 5 },
    { firstName: 'Geeta', lastName: 'Malhotra', email: 'geeta.malhotra@email.com', phone: '9876543245', gender: 'female' as const, daysToExpiry: 6 },
    { firstName: 'Rakesh', lastName: 'Agarwal', email: 'rakesh.agarwal@email.com', phone: '9876543246', gender: 'male' as const, daysToExpiry: 7 },
    { firstName: 'Nisha', lastName: 'Kapoor', email: 'nisha.kapoor@email.com', phone: '9876543247', gender: 'female' as const, daysToExpiry: 7 },
  ];

  expiringMembers.forEach((memberData, index) => {
    const slot = slots[index % slots.length];

    // Calculate dates so subscription expires in X days
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + memberData.daysToExpiry);
    const expEndDate = expiryDate.toISOString().split('T')[0];

    // Start date was 30 days before expiry (monthly plan)
    const expStartDate = new Date(expiryDate);
    expStartDate.setDate(expStartDate.getDate() - 30);
    const expStart = expStartDate.toISOString().split('T')[0];

    const member = memberService.create({
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone,
      gender: memberData.gender,
      status: 'active',
      source: 'walk-in',
      assignedSlotId: slot.id,
      classesAttended: Math.floor(Math.random() * 15) + 10,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create subscription directly
    const subscription = subscriptionService.create({
      memberId: member.id,
      planId: monthlyPlan.id,
      slotId: slot.id,
      startDate: expStart,
      endDate: expEndDate,
      originalAmount: monthlyPlan.price,
      discountAmount: 0,
      payableAmount: monthlyPlan.price,
      status: 'active',
      isExtension: false,
      paymentStatus: 'paid',
    });

    // Create paid invoice
    invoiceService.create({
      invoiceNumber: invoiceService.generateInvoiceNumber(),
      invoiceType: 'membership',
      memberId: member.id,
      amount: monthlyPlan.price,
      discount: 0,
      totalAmount: monthlyPlan.price,
      amountPaid: monthlyPlan.price,
      invoiceDate: expStart,
      dueDate: expStart,
      status: 'paid',
      items: [{
        description: `${monthlyPlan.name} Membership - ${slot.displayName}`,
        quantity: 1,
        unitPrice: monthlyPlan.price,
        total: monthlyPlan.price,
      }],
      subscriptionId: subscription.id,
    });

    // Create slot subscription
    slotSubscriptionService.create({
      memberId: member.id,
      slotId: slot.id,
      startDate: expStart,
      isActive: true,
      isException: false,
    });
  });

  // ============================================
  // CREATE MEMBER WITH % DISCOUNT (for testing renewal discount preservation)
  // ============================================
  const discountTestMember = {
    firstName: 'Pooja',
    lastName: 'Discount',
    email: 'pooja.discount@email.com',
    phone: '9876543299',
    gender: 'female' as const,
    daysToExpiry: 3,
    discountPercent: 20, // 20% discount
  };

  {
    const slot = slots[0];
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + discountTestMember.daysToExpiry);
    const expEndDate = expiryDate.toISOString().split('T')[0];

    const expStartDate = new Date(expiryDate);
    expStartDate.setDate(expStartDate.getDate() - 30);
    const expStart = expStartDate.toISOString().split('T')[0];

    const discountAmount = Math.round(monthlyPlan.price * discountTestMember.discountPercent / 100);
    const payableAmount = monthlyPlan.price - discountAmount;

    const member = memberService.create({
      firstName: discountTestMember.firstName,
      lastName: discountTestMember.lastName,
      email: discountTestMember.email,
      phone: discountTestMember.phone,
      gender: discountTestMember.gender,
      status: 'active',
      source: 'referral',
      assignedSlotId: slot.id,
      classesAttended: 20,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create subscription with percentage discount
    const subscription = subscriptionService.create({
      memberId: member.id,
      planId: monthlyPlan.id,
      slotId: slot.id,
      startDate: expStart,
      endDate: expEndDate,
      originalAmount: monthlyPlan.price,
      discountAmount: discountAmount,
      discountType: 'percentage',
      discountPercentage: discountTestMember.discountPercent,
      discountReason: 'Referral discount',
      payableAmount: payableAmount,
      status: 'active',
      isExtension: false,
      paymentStatus: 'paid',
    });

    // Create paid invoice
    invoiceService.create({
      invoiceNumber: invoiceService.generateInvoiceNumber(),
      invoiceType: 'membership',
      memberId: member.id,
      amount: monthlyPlan.price,
      discount: discountAmount,
      discountReason: 'Referral discount',
      totalAmount: payableAmount,
      amountPaid: payableAmount,
      invoiceDate: expStart,
      dueDate: expStart,
      status: 'paid',
      items: [{
        description: `${monthlyPlan.name} Membership - ${slot.displayName}`,
        quantity: 1,
        unitPrice: monthlyPlan.price,
        total: monthlyPlan.price,
      }],
      subscriptionId: subscription.id,
    });

    // Create slot subscription
    slotSubscriptionService.create({
      memberId: member.id,
      slotId: slot.id,
      startDate: expStart,
      isActive: true,
      isException: false,
    });

    console.log('Created test member "Pooja Discount" with 20% discount expiring in 3 days');
  }

  // ============================================
  // CREATE MEMBERS WITH EXPIRED SUBSCRIPTIONS (for testing expired notifications)
  // ============================================
  const expiredMembers = [
    { firstName: 'Ajay', lastName: 'Verma', email: 'ajay.verma@email.com', phone: '9876543250', gender: 'male' as const, daysAgoExpired: 1 },
    { firstName: 'Sunita', lastName: 'Rao', email: 'sunita.rao@email.com', phone: '9876543251', gender: 'female' as const, daysAgoExpired: 2 },
    { firstName: 'Deepak', lastName: 'Joshi', email: 'deepak.joshi@email.com', phone: '9876543252', gender: 'male' as const, daysAgoExpired: 4 },
    { firstName: 'Kavita', lastName: 'Nair', email: 'kavita.nair@email.com', phone: '9876543253', gender: 'female' as const, daysAgoExpired: 5 },
    { firstName: 'Rahul', lastName: 'Pandey', email: 'rahul.pandey@email.com', phone: '9876543254', gender: 'male' as const, daysAgoExpired: 7 },
  ];

  expiredMembers.forEach((memberData, index) => {
    const slot = slots[index % slots.length];

    // Calculate dates so subscription expired X days ago
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() - memberData.daysAgoExpired);
    const expEndDate = expiryDate.toISOString().split('T')[0];

    // Start date was 30 days before expiry (monthly plan)
    const expStartDate = new Date(expiryDate);
    expStartDate.setDate(expStartDate.getDate() - 30);
    const expStart = expStartDate.toISOString().split('T')[0];

    const member = memberService.create({
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone,
      gender: memberData.gender,
      status: 'active',
      source: 'walk-in',
      assignedSlotId: slot.id,
      classesAttended: Math.floor(Math.random() * 20) + 15,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create subscription with expired status
    const subscription = subscriptionService.create({
      memberId: member.id,
      planId: monthlyPlan.id,
      slotId: slot.id,
      startDate: expStart,
      endDate: expEndDate,
      originalAmount: monthlyPlan.price,
      discountAmount: 0,
      payableAmount: monthlyPlan.price,
      status: 'expired',
      isExtension: false,
      paymentStatus: 'paid',
    });

    // Create paid invoice
    invoiceService.create({
      invoiceNumber: invoiceService.generateInvoiceNumber(),
      invoiceType: 'membership',
      memberId: member.id,
      amount: monthlyPlan.price,
      discount: 0,
      totalAmount: monthlyPlan.price,
      amountPaid: monthlyPlan.price,
      invoiceDate: expStart,
      dueDate: expStart,
      status: 'paid',
      items: [{
        description: `${monthlyPlan.name} Membership - ${slot.displayName}`,
        quantity: 1,
        unitPrice: monthlyPlan.price,
        total: monthlyPlan.price,
      }],
      subscriptionId: subscription.id,
    });

    // Create slot subscription (inactive since expired)
    slotSubscriptionService.create({
      memberId: member.id,
      slotId: slot.id,
      startDate: expStart,
      isActive: false,
      isException: false,
    });
  });

  // ============================================
  // FILL FIRST SLOT TO CAPACITY FOR TRANSFER TESTING
  // ============================================
  // First slot (Morning 7:30 AM) already has ~3 members from round-robin + 1 expiring = 4
  // Add 6 more members to fill normal capacity (10). Exception capacity (1) will still be available.
  const fullSlot = slots[0]; // Morning 7:30 AM slot
  const fillSlotMembers = [
    { firstName: 'Ashwin', lastName: 'Menon', email: 'ashwin.menon@email.com', phone: '9876543260', gender: 'male' as const },
    { firstName: 'Divya', lastName: 'Krishnan', email: 'divya.k@email.com', phone: '9876543261', gender: 'female' as const },
    { firstName: 'Karthik', lastName: 'Subramanian', email: 'karthik.s@email.com', phone: '9876543262', gender: 'male' as const },
    { firstName: 'Revathi', lastName: 'Balan', email: 'revathi.b@email.com', phone: '9876543263', gender: 'female' as const },
    { firstName: 'Ganesh', lastName: 'Narayanan', email: 'ganesh.n@email.com', phone: '9876543264', gender: 'male' as const },
    { firstName: 'Shalini', lastName: 'Rajan', email: 'shalini.r@email.com', phone: '9876543265', gender: 'female' as const },
  ];

  fillSlotMembers.forEach((memberData) => {
    const member = memberService.create({
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone,
      gender: memberData.gender,
      status: 'active',
      source: 'referral',
      assignedSlotId: fullSlot.id,
      classesAttended: Math.floor(Math.random() * 10) + 5,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create subscription
    const subscription = subscriptionService.create({
      memberId: member.id,
      planId: monthlyPlan.id,
      slotId: fullSlot.id,
      startDate: startDate,
      endDate: endDate,
      originalAmount: monthlyPlan.price,
      discountAmount: 0,
      payableAmount: monthlyPlan.price,
      status: 'active',
      isExtension: false,
      paymentStatus: 'paid',
    });

    // Create slot subscription
    slotSubscriptionService.create({
      memberId: member.id,
      slotId: fullSlot.id,
      startDate: startDate,
      isActive: true,
      isException: false,
    });

    // Create invoice
    invoiceService.create({
      invoiceNumber: invoiceService.generateInvoiceNumber(),
      invoiceType: 'membership',
      memberId: member.id,
      amount: monthlyPlan.price,
      discount: 0,
      totalAmount: monthlyPlan.price,
      amountPaid: monthlyPlan.price,
      invoiceDate: startDate,
      dueDate: startDate,
      status: 'paid',
      items: [{
        description: `${monthlyPlan.name} Membership - ${fullSlot.displayName}`,
        quantity: 1,
        unitPrice: monthlyPlan.price,
        total: monthlyPlan.price,
      }],
      subscriptionId: subscription.id,
    });
  });

  // ============================================
  // CREATE MEMBER FOR TRANSFER TESTING
  // ============================================
  // Member in slot 2 who can be used to test transfer to full slot
  const transferTestMember = memberService.create({
    firstName: 'Sunil',
    lastName: 'Mehta',
    email: 'sunil.mehta@email.com',
    phone: '9876543290',
    gender: 'male',
    status: 'active',
    source: 'referral',
    assignedSlotId: slots[1]?.id, // In Morning 8:45 AM slot
    classesAttended: 8,
    medicalConditions: [],
    consentRecords: [],
  });

  const transferTestSub = subscriptionService.create({
    memberId: transferTestMember.id,
    planId: quarterlyPlan.id,
    slotId: slots[1]?.id!,
    startDate: startDate,
    endDate: quarterlyEndDate,
    originalAmount: quarterlyPlan.price,
    discountAmount: 0,
    payableAmount: quarterlyPlan.price,
    status: 'active',
    isExtension: false,
    paymentStatus: 'paid',
  });

  slotSubscriptionService.create({
    memberId: transferTestMember.id,
    slotId: slots[1]?.id!,
    startDate: startDate,
    isActive: true,
    isException: false,
  });

  invoiceService.create({
    invoiceNumber: invoiceService.generateInvoiceNumber(),
    invoiceType: 'membership',
    memberId: transferTestMember.id,
    amount: quarterlyPlan.price,
    discount: 0,
    totalAmount: quarterlyPlan.price,
    amountPaid: quarterlyPlan.price,
    invoiceDate: startDate,
    dueDate: startDate,
    status: 'paid',
    items: [{
      description: `${quarterlyPlan.name} Membership - ${slots[1]?.displayName}`,
      quantity: 1,
      unitPrice: quarterlyPlan.price,
      total: quarterlyPlan.price,
    }],
    subscriptionId: transferTestSub.id,
  });

  // ============================================
  // CREATE LEADS FOR CONVERSION TESTING
  // ============================================
  const sampleLeads = [
    // New lead - ready for direct conversion
    { firstName: 'Neha', lastName: 'Kapoor', email: 'neha.kapoor@email.com', phone: '9876543230', preferredSlot: slots[1]?.id, status: 'new' as const },
    // Contacted lead - ready for conversion
    { firstName: 'Rohit', lastName: 'Malhotra', email: 'rohit.m@email.com', phone: '9876543231', preferredSlot: slots[2]?.id, status: 'contacted' as const },
    // Negotiating lead - almost ready
    { firstName: 'Shreya', lastName: 'Agarwal', email: 'shreya.a@email.com', phone: '9876543232', preferredSlot: slots[1]?.id, status: 'negotiating' as const },
    // Lead interested in full slot - to test capacity check during conversion
    { firstName: 'Vivek', lastName: 'Srinivasan', email: 'vivek.s@email.com', phone: '9876543233', preferredSlot: fullSlot.id, status: 'new' as const },
  ];

  sampleLeads.forEach(leadData => {
    leadService.create({
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email,
      phone: leadData.phone,
      status: leadData.status,
      source: 'online',
      preferredSlotId: leadData.preferredSlot,
      medicalConditions: [],
      consentRecords: [],
    });
  });

  // ============================================
  // CREATE LEADS WITH TRIAL BOOKINGS
  // ============================================
  // Tomorrow's date for trial
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Skip weekends
  while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
    tomorrow.setDate(tomorrow.getDate() + 1);
  }
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Day after tomorrow
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  while (dayAfter.getDay() === 0 || dayAfter.getDay() === 6) {
    dayAfter.setDate(dayAfter.getDate() + 1);
  }
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  const trialLeads = [
    { firstName: 'Poornima', lastName: 'Das', email: 'poornima.d@email.com', phone: '9876543280', trialSlot: slots[1]?.id, trialDate: tomorrowStr, trialCompleted: false },
    { firstName: 'Venkat', lastName: 'Raman', email: 'venkat.r@email.com', phone: '9876543281', trialSlot: slots[2]?.id, trialDate: dayAfterStr, trialCompleted: false },
    { firstName: 'Smita', lastName: 'Banerjee', email: 'smita.b@email.com', phone: '9876543282', trialSlot: slots[1]?.id, trialDate: today, trialCompleted: true },
  ];

  trialLeads.forEach(leadData => {
    const lead = leadService.create({
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email,
      phone: leadData.phone,
      status: leadData.trialCompleted ? 'trial-completed' : 'trial-scheduled',
      source: 'online',
      preferredSlotId: leadData.trialSlot,
      trialDate: leadData.trialDate,
      trialSlotId: leadData.trialSlot,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create trial booking
    trialBookingService.create({
      leadId: lead.id,
      slotId: leadData.trialSlot!,
      date: leadData.trialDate,
      status: leadData.trialCompleted ? 'attended' : 'confirmed',
      isException: false,
      confirmationSent: true,
      reminderSent: leadData.trialCompleted,
    });
  });

  // Mark seed data as initialized
  localStorage.setItem(SEED_DATA_KEY, 'true');
  console.log('Seed data created successfully: 12 regular members, 3 expiring members, 6 fill members, 1 transfer test member, 4 leads, 3 leads with trials');
}

// Function to reset all data and re-seed
export function resetAndSeedData(): void {
  // Clear the seed flag
  localStorage.removeItem(SEED_DATA_KEY);

  // Clear all data
  backupService.clearAll();

  // Re-seed
  seedDemoData();
}

// ============================================
// LEGACY SERVICES (kept for backward compatibility)
// ============================================

export const instructorService = {
  getAll: () => getAll<Instructor>(STORAGE_KEYS.INSTRUCTORS),
  getById: (id: string) => getById<Instructor>(STORAGE_KEYS.INSTRUCTORS, id),
  create: (data: Omit<Instructor, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Instructor>(STORAGE_KEYS.INSTRUCTORS, data),
  update: (id: string, data: Partial<Instructor>) =>
    update<Instructor>(STORAGE_KEYS.INSTRUCTORS, id, data),
  delete: (id: string) => remove<Instructor>(STORAGE_KEYS.INSTRUCTORS, id),
  getActive: (): Instructor[] => {
    const instructors = getAll<Instructor>(STORAGE_KEYS.INSTRUCTORS);
    return instructors.filter(i => i.status === 'active');
  },
};

export const classService = {
  getAll: () => getAll<YogaClass>(STORAGE_KEYS.CLASSES),
  getById: (id: string) => getById<YogaClass>(STORAGE_KEYS.CLASSES, id),
  create: (data: Omit<YogaClass, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<YogaClass>(STORAGE_KEYS.CLASSES, data),
  update: (id: string, data: Partial<YogaClass>) =>
    update<YogaClass>(STORAGE_KEYS.CLASSES, id, data),
  delete: (id: string) => remove<YogaClass>(STORAGE_KEYS.CLASSES, id),
};

export const scheduleService = {
  getAll: () => getAll<ClassSchedule>(STORAGE_KEYS.SCHEDULES),
  getById: (id: string) => getById<ClassSchedule>(STORAGE_KEYS.SCHEDULES, id),
  create: (data: Omit<ClassSchedule, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<ClassSchedule>(STORAGE_KEYS.SCHEDULES, data),
  update: (id: string, data: Partial<ClassSchedule>) =>
    update<ClassSchedule>(STORAGE_KEYS.SCHEDULES, id, data),
  delete: (id: string) => remove<ClassSchedule>(STORAGE_KEYS.SCHEDULES, id),
};

export const bookingService = {
  getAll: () => getAll<Booking>(STORAGE_KEYS.BOOKINGS),
  getById: (id: string) => getById<Booking>(STORAGE_KEYS.BOOKINGS, id),
  create: (data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Booking>(STORAGE_KEYS.BOOKINGS, data),
  update: (id: string, data: Partial<Booking>) =>
    update<Booking>(STORAGE_KEYS.BOOKINGS, id, data),
  delete: (id: string) => remove<Booking>(STORAGE_KEYS.BOOKINGS, id),
};

export const trialRequestService = {
  getAll: () => getAll<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS),
  getById: (id: string) => getById<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS, id),
  create: (data: Omit<TrialRequest, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS, data),
  update: (id: string, data: Partial<TrialRequest>) =>
    update<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS, id, data),
  delete: (id: string) => remove<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS, id),
  getPending: (): TrialRequest[] => {
    const requests = getAll<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS);
    return requests.filter(r => r.status === 'pending');
  },
};

export const notificationService = {
  getAll: () => getAll<NotificationLog>(STORAGE_KEYS.NOTIFICATIONS),
  getById: (id: string) => getById<NotificationLog>(STORAGE_KEYS.NOTIFICATIONS, id),
  create: (data: Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<NotificationLog>(STORAGE_KEYS.NOTIFICATIONS, data),
  update: (id: string, data: Partial<NotificationLog>) =>
    update<NotificationLog>(STORAGE_KEYS.NOTIFICATIONS, id, data),
  delete: (id: string) => remove<NotificationLog>(STORAGE_KEYS.NOTIFICATIONS, id),
};

// ============================================
// ATTENDANCE SERVICE
// ============================================

import { getWorkingDaysCountForSubscription, getWorkingDaysInRange } from '../utils/dateUtils';

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
    const daysDiff = Math.floor((today.getTime() - attendanceDate.getTime()) / (1000 * 60 * 60 * 24));

    // CRITICAL: Block future dates - attendance can ONLY be marked for today or past
    if (daysDiff < 0) {
      throw new Error('Cannot mark attendance for future dates');
    }

    // Existing rule: Cannot mark attendance more than 3 days in the past
    if (daysDiff > 3) {
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
    // Get attendance records for this member and slot in the period
    const records = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);

    // Debug: Log all records for this member
    const allMemberRecords = records.filter(r => r.memberId === memberId && r.slotId === slotId);
    console.log('[Attendance] All records for member:', memberId, allMemberRecords.map(r => ({ date: r.date, status: r.status })));
    console.log('[Attendance] Period:', periodStart, 'to', periodEnd);

    const memberRecords = records.filter(r =>
      r.memberId === memberId &&
      r.slotId === slotId &&
      r.date >= periodStart &&
      r.date <= periodEnd &&
      r.status === 'present'
    );

    console.log('[Attendance] Records in period with present status:', memberRecords.length);

    const presentDays = memberRecords.length;

    // CHANGE 1: Calculate working days based ONLY on selected period (not membership dates)
    // Get holidays from settings to exclude them
    const settings = settingsService.get();
    const holidays = settings?.holidays || [];

    // Count working days (Mon-Fri) in the period, excluding holidays
    const workingDays = getWorkingDaysInRange(periodStart, periodEnd);
    const totalWorkingDays = workingDays.filter(date => {
      // Exclude holidays - check both exact date and recurring yearly holidays
      const isHoliday = holidays.some(h => {
        if (h.date === date) return true;
        // For recurring yearly holidays, check if month-day matches
        if (h.isRecurringYearly) {
          const holidayMonthDay = h.date.substring(5); // "MM-DD"
          const dateMonthDay = date.substring(5);
          return holidayMonthDay === dateMonthDay;
        }
        return false;
      });
      return !isHoliday;
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
    // Get active subscriptions for this slot on this date
    const subscriptions = subscriptionService.getActiveForSlotOnDate(slotId, date);

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
    const daysDiff = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

    // Current day (daysDiff === 0): default UNLOCKED
    if (daysDiff === 0) {
      return false;
    }

    // Previous 1-3 days: default LOCKED
    if (daysDiff >= 1 && daysDiff <= 3) {
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
    const daysDiff = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

    // Block future dates
    if (daysDiff < 0) {
      return { allowed: false, reason: 'Cannot mark attendance for future dates' };
    }

    // Block dates older than 3 days
    if (daysDiff > 3) {
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
// NOTIFICATION LOGS SERVICE
// Tracks WhatsApp notification attempts
// ============================================

export const notificationLogService = {
  // Get all notification logs
  getAll: (): NotificationLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_LOGS);
    return data ? JSON.parse(data) : [];
  },

  // Save all notification logs
  saveAll: (logs: NotificationLog[]): void => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_LOGS, JSON.stringify(logs));
  },

  // Get notification log by ID
  getById: (id: string): NotificationLog | undefined => {
    return notificationLogService.getAll().find(log => log.id === id);
  },

  // Get pending notifications
  getPending: (): NotificationLog[] => {
    return notificationLogService.getAll().filter(log => log.status === 'pending');
  },

  // Get notifications by type
  getByType: (type: NotificationType): NotificationLog[] => {
    return notificationLogService.getAll().filter(log => log.type === type);
  },

  // Get notifications by recipient
  getByRecipient: (recipientType: 'member' | 'lead', recipientId: string): NotificationLog[] => {
    return notificationLogService.getAll().filter(
      log => log.recipientType === recipientType && log.recipientId === recipientId
    );
  },

  // Create a new notification log
  create: (data: Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'>): NotificationLog => {
    const now = new Date().toISOString();
    const newLog: NotificationLog = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const logs = notificationLogService.getAll();
    logs.unshift(newLog); // Add to beginning (most recent first)
    notificationLogService.saveAll(logs);

    // Sync to API if in API mode
    if (isApiMode()) {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const apiKey = import.meta.env.VITE_API_KEY || '';

      fetch(`${baseUrl}/notification-logs?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(newLog),
      }).catch(error => {
        console.error('[API Write] notification-logs create error:', error);
      });
    }

    return newLog;
  },

  // Mark notification as sent
  markSent: (id: string): NotificationLog | undefined => {
    const logs = notificationLogService.getAll();
    const index = logs.findIndex(log => log.id === id);
    if (index === -1) return undefined;

    const now = new Date().toISOString();
    logs[index] = {
      ...logs[index],
      status: 'sent',
      sentAt: now,
      updatedAt: now,
    };
    notificationLogService.saveAll(logs);

    // Sync to API if in API mode
    if (isApiMode()) {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const apiKey = import.meta.env.VITE_API_KEY || '';

      fetch(`${baseUrl}/notification-logs?action=markSent&id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
      }).catch(error => {
        console.error('[API Write] notification-logs markSent error:', error);
      });
    }

    return logs[index];
  },

  // Cancel notification
  cancel: (id: string): NotificationLog | undefined => {
    const logs = notificationLogService.getAll();
    const index = logs.findIndex(log => log.id === id);
    if (index === -1) return undefined;

    const now = new Date().toISOString();
    logs[index] = {
      ...logs[index],
      status: 'cancelled',
      updatedAt: now,
    };
    notificationLogService.saveAll(logs);

    // Sync to API if in API mode
    if (isApiMode()) {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const apiKey = import.meta.env.VITE_API_KEY || '';

      fetch(`${baseUrl}/notification-logs?action=cancel&id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
      }).catch(error => {
        console.error('[API Write] notification-logs cancel error:', error);
      });
    }

    return logs[index];
  },

  // Get counts by status
  getCounts: (): { pending: number; sent: number; cancelled: number } => {
    const logs = notificationLogService.getAll();
    return {
      pending: logs.filter(l => l.status === 'pending').length,
      sent: logs.filter(l => l.status === 'sent').length,
      cancelled: logs.filter(l => l.status === 'cancelled').length,
    };
  },
};

// ============================================
// PRODUCT SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const productService = {
  // Synchronous CRUD methods
  getAll: () => getAll<Product>(STORAGE_KEYS.PRODUCTS),
  getById: (id: string) => getById<Product>(STORAGE_KEYS.PRODUCTS, id),
  create: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Product>(STORAGE_KEYS.PRODUCTS, data),
  update: (id: string, data: Partial<Product>) =>
    updateDual<Product>(STORAGE_KEYS.PRODUCTS, id, data),
  delete: (id: string) => removeDual<Product>(STORAGE_KEYS.PRODUCTS, id),

  // Custom query methods
  getBySku: (sku: string): Product | null => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    return products.find(p => p.sku === sku) || null;
  },

  getByCategory: (category: ProductCategory): Product[] => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    return products.filter(p => p.category === category);
  },

  getActive: (): Product[] => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    return products.filter(p => p.isActive);
  },

  getLowStock: (): Product[] => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    return products.filter(p => p.isActive && p.currentStock <= p.lowStockThreshold);
  },

  search: (query: string): Product[] => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    const lowerQuery = query.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.sku.toLowerCase().includes(lowerQuery) ||
      (p.description && p.description.toLowerCase().includes(lowerQuery))
    );
  },

  // Stock value calculation
  getStockValue: (): { totalCost: number; totalValue: number; totalItems: number } => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS).filter(p => p.isActive);
    return {
      totalCost: products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0),
      totalValue: products.reduce((sum, p) => sum + (p.currentStock * p.sellingPrice), 0),
      totalItems: products.reduce((sum, p) => sum + p.currentStock, 0),
    };
  },

  // Update stock level (used by inventory service)
  updateStock: (productId: string, newStock: number): Product | null => {
    return productService.update(productId, { currentStock: newStock });
  },

  // Generate SKU based on category
  generateSku: (category: ProductCategory): string => {
    // Category prefixes
    const prefixMap: Record<ProductCategory, string> = {
      'yoga-equipment': 'YEQ',
      'clothing': 'CLT',
      'supplements': 'SUP',
      'accessories': 'ACC',
      'books': 'BKS',
      'other': 'OTH',
    };

    const prefix = prefixMap[category] || 'PRD';
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);

    // Find highest number for this prefix
    let maxNum = 0;
    products.forEach(p => {
      if (p.sku.startsWith(prefix + '-')) {
        const numPart = parseInt(p.sku.substring(prefix.length + 1), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });

    // Generate next SKU with 3-digit padding
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  },

  // Check if SKU is unique
  isSkuUnique: (sku: string, excludeId?: string): boolean => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    return !products.some(p => p.sku === sku && p.id !== excludeId);
  },
};

// ============================================
// INVENTORY SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const inventoryService = {
  // Synchronous CRUD methods
  getAll: () => getAll<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS),
  getById: (id: string) => getById<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS, id),
  create: (data: Omit<InventoryTransaction, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS, data),
  update: (id: string, data: Partial<InventoryTransaction>) =>
    updateDual<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS, id, data),
  delete: (id: string) => removeDual<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS, id),

  // Query methods
  getByProduct: (productId: string): InventoryTransaction[] => {
    const transactions = getAll<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS);
    return transactions
      .filter(t => t.productId === productId)
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  },

  getByType: (type: InventoryTransactionType): InventoryTransaction[] => {
    const transactions = getAll<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS);
    return transactions.filter(t => t.type === type);
  },

  getByDateRange: (startDate: string, endDate: string): InventoryTransaction[] => {
    const transactions = getAll<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS);
    return transactions.filter(t =>
      t.transactionDate >= startDate && t.transactionDate <= endDate
    );
  },

  // Record a purchase (stock in from vendor)
  recordPurchase: (
    productId: string,
    quantity: number,
    unitCost: number,
    expenseId?: string,
    vendorName?: string,
    notes?: string
  ): InventoryTransaction => {
    const product = productService.getById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const previousStock = product.currentStock;
    const newStock = previousStock + quantity;
    const today = new Date().toISOString().split('T')[0];

    // Create transaction record
    const transaction = inventoryService.create({
      productId,
      type: 'purchase',
      quantity,
      unitCost,
      totalValue: quantity * unitCost,
      expenseId,
      vendorName,
      previousStock,
      newStock,
      transactionDate: today,
      notes,
    });

    // Update product stock
    productService.updateStock(productId, newStock);

    return transaction;
  },

  // Record a sale (stock out to customer)
  recordSale: (
    productId: string,
    quantity: number,
    unitCost: number,
    invoiceId: string,
    notes?: string
  ): InventoryTransaction => {
    const product = productService.getById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.currentStock < quantity) {
      throw new Error('Insufficient stock');
    }

    const previousStock = product.currentStock;
    const newStock = previousStock - quantity;
    const today = new Date().toISOString().split('T')[0];

    // Create transaction record
    const transaction = inventoryService.create({
      productId,
      type: 'sale',
      quantity: -quantity, // Negative for stock out
      unitCost,
      totalValue: quantity * unitCost,
      invoiceId,
      previousStock,
      newStock,
      transactionDate: today,
      notes,
    });

    // Update product stock
    productService.updateStock(productId, newStock);

    return transaction;
  },

  // Record studio consumption (stock out for internal use)
  recordConsumption: (
    productId: string,
    quantity: number,
    notes?: string
  ): { transaction: InventoryTransaction; expense: Expense } => {
    const product = productService.getById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.currentStock < quantity) {
      throw new Error('Insufficient stock');
    }

    const previousStock = product.currentStock;
    const newStock = previousStock - quantity;
    const today = new Date().toISOString().split('T')[0];
    const totalCost = quantity * product.costPrice;

    // Create expense record for studio consumption
    const expense = expenseService.create({
      expenseNumber: expenseService.generateExpenseNumber(),
      category: 'supplies',
      description: `Studio consumption: ${product.name} (${quantity} ${product.unit})`,
      vendorName: 'Studio Consumption',
      amount: totalCost,
      totalAmount: totalCost,
      amountPaid: totalCost,  // Auto-paid (internal consumption)
      items: [{
        description: product.name,
        productId: product.id,
        quantity,
        unitCost: product.costPrice,
        total: totalCost,
      }],
      expenseDate: today,
      paymentStatus: 'paid',
      paidDate: today,
      notes: notes || `Consumed from inventory for studio use`,
    });

    // Create transaction record linked to expense
    const transaction = inventoryService.create({
      productId,
      type: 'consumed',
      quantity: -quantity,
      unitCost: product.costPrice,
      totalValue: totalCost,
      expenseId: expense.id,  // Link to expense
      previousStock,
      newStock,
      transactionDate: today,
      notes,
    });

    // Update product stock
    productService.updateStock(productId, newStock);

    return { transaction, expense };
  },

  // Record stock adjustment (manual correction)
  recordAdjustment: (
    productId: string,
    newStockLevel: number,
    notes?: string
  ): InventoryTransaction => {
    const product = productService.getById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const previousStock = product.currentStock;
    const quantityChange = newStockLevel - previousStock;
    const today = new Date().toISOString().split('T')[0];

    // Create transaction record
    const transaction = inventoryService.create({
      productId,
      type: 'adjustment',
      quantity: quantityChange,
      unitCost: product.costPrice,
      totalValue: Math.abs(quantityChange) * product.costPrice,
      previousStock,
      newStock: newStockLevel,
      transactionDate: today,
      notes,
    });

    // Update product stock
    productService.updateStock(productId, newStockLevel);

    return transaction;
  },

  // Calculate Cost of Goods Sold for a period
  getCostOfGoodsSold: (startDate: string, endDate: string): { cogs: number; count: number } => {
    const transactions = inventoryService.getByDateRange(startDate, endDate);
    const salesTransactions = transactions.filter(t => t.type === 'sale');
    return {
      cogs: salesTransactions.reduce((sum, t) => sum + t.totalValue, 0),
      count: salesTransactions.length,
    };
  },
};

// ============================================
// EXPENSE SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const expenseService = {
  // Synchronous CRUD methods
  getAll: () => getAll<Expense>(STORAGE_KEYS.EXPENSES),
  getById: (id: string) => getById<Expense>(STORAGE_KEYS.EXPENSES, id),
  create: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Expense>(STORAGE_KEYS.EXPENSES, data),
  update: (id: string, data: Partial<Expense>) =>
    updateDual<Expense>(STORAGE_KEYS.EXPENSES, id, data),
  delete: (id: string) => removeDual<Expense>(STORAGE_KEYS.EXPENSES, id),

  // Query methods
  getByCategory: (category: ExpenseCategory): Expense[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    return expenses.filter(e => e.category === category);
  },

  getByVendor: (vendorName: string): Expense[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    const lowerVendor = vendorName.toLowerCase();
    return expenses.filter(e => e.vendorName.toLowerCase().includes(lowerVendor));
  },

  getByDateRange: (startDate: string, endDate: string): Expense[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    return expenses
      .filter(e => e.expenseDate >= startDate && e.expenseDate <= endDate)
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  },

  getPending: (): Expense[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    return expenses.filter(e => e.paymentStatus === 'pending' || e.paymentStatus === 'partial');
  },

  getRecurring: (): Expense[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    return expenses.filter(e => e.isRecurring);
  },

  // Generate expense number
  generateExpenseNumber: (): string => {
    const settings = settingsService.getOrDefault();
    const prefix = settings.expensePrefix || 'EXP';
    const startNumber = settings.expenseStartNumber || 1;

    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);

    // Find the highest existing number
    let maxNum = 0;
    expenses.forEach(exp => {
      const match = exp.expenseNumber.match(new RegExp(`${prefix}-(\\d+)`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    // Next number is max of (highest existing, startNumber - 1) + 1
    const nextNumber = Math.max(maxNum, startNumber - 1) + 1;
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  },

  // Record payment for an expense
  recordPayment: (
    expenseId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string
  ): Expense | null => {
    const expense = expenseService.getById(expenseId);
    if (!expense) return null;

    const newAmountPaid = expense.amountPaid + amount;
    const today = new Date().toISOString().split('T')[0];

    let paymentStatus: ExpensePaymentStatus = 'partial';
    if (newAmountPaid >= expense.totalAmount) {
      paymentStatus = 'paid';
    }

    return expenseService.update(expenseId, {
      amountPaid: newAmountPaid,
      paymentStatus,
      paymentMethod: method,
      paymentReference: reference,
      paidDate: paymentStatus === 'paid' ? today : undefined,
    });
  },

  // Get total expenses by category for a period
  getTotalByCategory: (startDate: string, endDate: string): Record<ExpenseCategory, number> => {
    const expenses = expenseService.getByDateRange(startDate, endDate);
    const categories: ExpenseCategory[] = [
      'procurement', 'rent', 'utilities', 'salaries', 'maintenance',
      'marketing', 'insurance', 'professional-fees', 'equipment',
      'supplies', 'travel', 'other'
    ];

    const result: Record<ExpenseCategory, number> = {} as Record<ExpenseCategory, number>;
    categories.forEach(cat => {
      result[cat] = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.totalAmount, 0);
    });

    return result;
  },

  // Get monthly expense totals
  getMonthlyExpenses: (months: number): { month: string; total: number }[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    const result: { month: string; total: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = date.toISOString().split('T')[0];
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const monthTotal = expenses
        .filter(e => e.expenseDate >= monthStart && e.expenseDate <= monthEnd)
        .reduce((sum, e) => sum + e.totalAmount, 0);

      result.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        total: monthTotal,
      });
    }

    return result;
  },

  // Create a procurement expense with inventory transactions
  createProcurement: (
    vendorName: string,
    items: { productId: string; quantity: number; unitCost: number }[],
    paymentDetails: {
      paid: boolean;
      method?: PaymentMethod;
      reference?: string;
    },
    notes?: string
  ): { expense: Expense; transactions: InventoryTransaction[] } => {
    const today = new Date().toISOString().split('T')[0];

    // Build expense items
    const expenseItems: ExpenseItem[] = items.map(item => {
      const product = productService.getById(item.productId);
      return {
        description: product ? product.name : `Product ${item.productId}`,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        total: item.quantity * item.unitCost,
      };
    });

    const amount = expenseItems.reduce((sum, item) => sum + item.total, 0);

    // Create expense
    const expense = expenseService.create({
      expenseNumber: expenseService.generateExpenseNumber(),
      category: 'procurement',
      description: `Product procurement from ${vendorName}`,
      vendorName,
      amount,
      totalAmount: amount,
      amountPaid: paymentDetails.paid ? amount : 0,
      items: expenseItems,
      expenseDate: today,
      paymentStatus: paymentDetails.paid ? 'paid' : 'pending',
      paymentMethod: paymentDetails.method,
      paymentReference: paymentDetails.reference,
      paidDate: paymentDetails.paid ? today : undefined,
      notes,
    });

    // Create inventory transactions for each item
    const transactions: InventoryTransaction[] = items.map(item =>
      inventoryService.recordPurchase(
        item.productId,
        item.quantity,
        item.unitCost,
        expense.id,
        vendorName,
        `Procurement: ${expense.expenseNumber}`
      )
    );

    return { expense, transactions };
  },

  // Get total expenses for a period
  getTotal: (startDate: string, endDate: string): number => {
    const expenses = expenseService.getByDateRange(startDate, endDate);
    return expenses.reduce((sum, e) => sum + e.totalAmount, 0);
  },
};

// ============================================
// DATA SYNC FROM API TO LOCALSTORAGE
// Enables existing sync methods to work with API data
// ============================================

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

// ============================================
// TIERED DATA SYNC FUNCTIONS
// For faster initial page load
// ============================================

const TIERED_API_URL = import.meta.env.VITE_API_URL || '/api';
const TIERED_API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Sync only essential data (settings, slots, plans)
 * Used on app startup for fast initial load
 */
export async function syncEssentialData(): Promise<void> {
  if (!isApiMode()) {
    console.log('[Storage] localStorage mode - no essential sync needed');
    return;
  }

  console.log('[Storage] Syncing essential data (settings, slots, plans)...');

  try {
    const [slots, settings, plansData] = await Promise.all([
      slotsApi.getAll().catch(() => []),
      settingsApi.get().catch(() => null),
      fetch(`${TIERED_API_URL}/plans`, {
        headers: { 'X-API-Key': TIERED_API_KEY },
      }).then(r => r.json()).catch(() => []),
    ]);

    // Store in localStorage
    saveAll(STORAGE_KEYS.SESSION_SLOTS, slots as SessionSlot[]);
    saveAll(STORAGE_KEYS.MEMBERSHIP_PLANS, Array.isArray(plansData) ? plansData : plansData.data || []);

    if (settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    // Mark essential sync as completed
    localStorage.setItem('yoga_studio_essential_synced', new Date().toISOString());

    console.log('[Storage] Essential sync complete:', {
      slots: (slots as SessionSlot[]).length,
      plans: (Array.isArray(plansData) ? plansData : plansData.data || []).length,
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
  };

  // Fetch all requested features in parallel
  const promises = features
    .filter(f => fetchers[f])
    .map(f => fetchers[f]());

  await Promise.all(promises);

  console.log('[Storage] Feature sync complete for:', features);
}
