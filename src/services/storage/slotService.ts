/**
 * Session Slot Service + Slot Subscription Service
 * Dual-mode: localStorage (default) or API
 */

import { isApiMode, slotsApi } from '../api';
import type { SessionSlot, SlotSubscription, SlotAvailability } from '../../types';
import { STORAGE_KEYS, DEFAULT_SESSION_SLOTS } from '../../constants';
import { getAll, getById, create, update, remove, createDual, updateDual } from './helpers';
import { memberService } from './memberService';
import { subscriptionService } from './subscriptionService';
import { trialBookingService } from './trialBookingService';

export const slotService = {
  getAll: (): SessionSlot[] => {
    let slots = getAll<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS);
    if (slots.length === 0) {
      // Initialize with default slots
      slotService.initializeDefaults();
      slots = getAll<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS);
    }
    // Backfill sessionType for slots created before the field was added
    return slots.map(s => ({
      ...s,
      sessionType: s.sessionType || (s.displayName.toLowerCase().includes('online') ? 'online' : 'offline'),
    }));
  },

  getById: (id: string) => getById<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS, id),

  create: (data: Omit<SessionSlot, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS, data),

  // Dual-mode update: updates localStorage AND immediately writes to API
  update: (id: string, data: Partial<SessionSlot>) =>
    updateDual<SessionSlot>(STORAGE_KEYS.SESSION_SLOTS, id, data),

  getActive: (): SessionSlot[] => {
    return slotService.getAll()
      .filter(s => s.isActive)
      .sort((a, b) => {
        // Online slots always last
        if (a.sessionType === 'online' && b.sessionType !== 'online') return 1;
        if (a.sessionType !== 'online' && b.sessionType === 'online') return -1;
        return 0;
      });
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
