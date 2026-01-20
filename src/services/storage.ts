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
  // Legacy types
  Instructor,
  YogaClass,
  ClassSchedule,
  Booking,
  TrialRequest,
  NotificationLog,
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
// MEMBER SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const memberService = {
  // Synchronous methods - localStorage mode only (original logic preserved)
  getAll: () => getAll<Member>(STORAGE_KEYS.MEMBERS),
  getById: (id: string) => getById<Member>(STORAGE_KEYS.MEMBERS, id),
  create: (data: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Member>(STORAGE_KEYS.MEMBERS, data),
  update: (id: string, data: Partial<Member>) =>
    update<Member>(STORAGE_KEYS.MEMBERS, id, data),
  delete: (id: string) => remove<Member>(STORAGE_KEYS.MEMBERS, id),

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
  // Synchronous methods - localStorage mode only
  getAll: () => getAll<Lead>(STORAGE_KEYS.LEADS),
  getById: (id: string) => getById<Lead>(STORAGE_KEYS.LEADS, id),
  create: (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Lead>(STORAGE_KEYS.LEADS, data),
  update: (id: string, data: Partial<Lead>) =>
    update<Lead>(STORAGE_KEYS.LEADS, id, data),
  delete: (id: string) => remove<Lead>(STORAGE_KEYS.LEADS, id),

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
  create: (data: Omit<MembershipPlan, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, data),
  update: (id: string, data: Partial<MembershipPlan>) =>
    update<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, id, data),
  delete: (id: string) => remove<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, id),

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
  // Synchronous methods - localStorage mode only
  getAll: () => getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS),
  getById: (id: string) => getById<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, id),
  create: (data: Omit<MembershipSubscription, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, data),
  update: (id: string, data: Partial<MembershipSubscription>) =>
    update<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, id, data),
  delete: (id: string) => remove<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, id),

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
    notes?: string
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
        return subscriptionsApi.update(id, data as Partial<MembershipSubscription>) as Promise<MembershipSubscription | null>;
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

  update: (id: string, data: Partial<SessionSlot>) =>
    update<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS, id, data),

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
  getAll: () => getAll<Invoice>(STORAGE_KEYS.INVOICES),
  getById: (id: string) => getById<Invoice>(STORAGE_KEYS.INVOICES, id),
  create: (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Invoice>(STORAGE_KEYS.INVOICES, data),
  update: (id: string, data: Partial<Invoice>) =>
    update<Invoice>(STORAGE_KEYS.INVOICES, id, data),
  delete: (id: string) => remove<Invoice>(STORAGE_KEYS.INVOICES, id),

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
    const nextNumber = invoices.length + 1;
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
        return invoicesApi.create(data as Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) as Promise<Invoice>;
      }
      return create<Invoice>(STORAGE_KEYS.INVOICES, data);
    },

    update: async (id: string, data: Partial<Invoice>): Promise<Invoice | null> => {
      if (isApiMode()) {
        return invoicesApi.update(id, data as Partial<Invoice>) as Promise<Invoice | null>;
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
  getAll: () => getAll<Payment>(STORAGE_KEYS.PAYMENTS),
  getById: (id: string) => getById<Payment>(STORAGE_KEYS.PAYMENTS, id),
  create: (data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Payment>(STORAGE_KEYS.PAYMENTS, data),
  update: (id: string, data: Partial<Payment>) =>
    update<Payment>(STORAGE_KEYS.PAYMENTS, id, data),
  delete: (id: string) => remove<Payment>(STORAGE_KEYS.PAYMENTS, id),

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
    const nextNumber = payments.length + 1;
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

    // Update invoice
    const totalPaid = (invoice.amountPaid || 0) + amount;
    const newStatus = totalPaid >= invoice.totalAmount ? 'paid' : 'partially-paid';

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
      .reduce((sum, p) => sum + p.amount, 0);
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
        return result.revenue;
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

        // Update invoice via API
        const totalPaid = (invoice.amountPaid || 0) + amount;
        const newStatus = totalPaid >= invoice.totalAmount ? 'paid' : 'partially-paid';
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
  getAll: () => getAll<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS),
  getById: (id: string) => getById<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, id),
  create: (data: Omit<TrialBooking, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, data),
  update: (id: string, data: Partial<TrialBooking>) =>
    update<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, id, data),
  delete: (id: string) => remove<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, id),

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
// ============================================

export const settingsService = {
  get: (): StudioSettings | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  save: (settings: StudioSettings): void => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getOrDefault: (): StudioSettings => {
    const existing = settingsService.get();
    if (existing) return existing;

    settingsService.save(DEFAULT_STUDIO_SETTINGS);
    return DEFAULT_STUDIO_SETTINGS;
  },

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
    { firstName: 'Sanjay', lastName: 'Chopra', email: 'sanjay.chopra@email.com', phone: '9876543240', gender: 'male' as const, daysToExpiry: 3 },
    { firstName: 'Lakshmi', lastName: 'Pillai', email: 'lakshmi.pillai@email.com', phone: '9876543241', gender: 'female' as const, daysToExpiry: 5 },
    { firstName: 'Manoj', lastName: 'Tiwari', email: 'manoj.tiwari@email.com', phone: '9876543242', gender: 'male' as const, daysToExpiry: 7 },
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

import { getWorkingDaysCountForSubscription } from '../utils/dateUtils';

export const attendanceService = {
  // Basic CRUD
  getAll: () => getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE),
  getById: (id: string) => getById<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, id),
  create: (data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, data),
  update: (id: string, data: Partial<AttendanceRecord>) =>
    update<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, id, data),
  delete: (id: string) => remove<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, id),

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

    // Validate date is not more than 3 days in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - attendanceDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 3) {
      throw new Error('Cannot mark attendance for more than 3 days in the past');
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

    // Auto-increment classesAttended if marked present
    if (status === 'present') {
      memberService.update(memberId, {
        classesAttended: (member.classesAttended || 0) + 1
      });
    }

    return record;
  },

  // Get member's attendance summary for a period
  getMemberSummaryForPeriod: (
    memberId: string,
    slotId: string,
    periodStart: string,
    periodEnd: string
  ): { presentDays: number; totalWorkingDays: number } => {
    // Get attendance records for this member and slot in the period
    const records = getAll<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
    const memberRecords = records.filter(r =>
      r.memberId === memberId &&
      r.slotId === slotId &&
      r.date >= periodStart &&
      r.date <= periodEnd &&
      r.status === 'present'
    );
    const presentDays = memberRecords.length;

    // Get member's subscriptions for this slot to calculate total working days
    const subscriptions = subscriptionService.getByMember(memberId);
    const slotSubscriptions = subscriptions.filter(s =>
      s.slotId === slotId &&
      ['active', 'expired'].includes(s.status) // Include expired for history
    );

    // Calculate total working days across all subscriptions (avoiding double-counting)
    let totalWorkingDays = 0;
    for (const sub of slotSubscriptions) {
      totalWorkingDays += getWorkingDaysCountForSubscription(
        periodStart,
        periodEnd,
        sub.startDate,
        sub.endDate
      );
    }

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
