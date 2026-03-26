/**
 * Trial Booking Service
 * Dual-mode: localStorage (default) or API
 */

import { isApiMode, trialsApi } from '../api';
import type { TrialBooking } from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { getAll, getById, create, update, remove, createDual, updateDual, removeDual } from './helpers';
import { leadService } from './leadService';
import { memberService } from './memberService';
import { subscriptionService } from './subscriptionService';
import { slotService } from './slotService';
import { settingsService } from './settingsService';

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

    // Check if it's a working day (Monday-Friday, or extra working day)
    const dayOfWeek = new Date(date).getDay();
    const extraWorkingDays = settingsService.get()?.extraWorkingDays || [];
    if ((dayOfWeek === 0 || dayOfWeek === 6) && !extraWorkingDays.some(d => d.date === date)) {
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

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // Use these in React Query or async contexts
  // ============================================
  async: {
    getAll: async (): Promise<TrialBooking[]> => {
      if (isApiMode()) {
        return trialsApi.getAll() as Promise<TrialBooking[]>;
      }
      return getAll<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS);
    },

    getById: async (id: string): Promise<TrialBooking | null> => {
      if (isApiMode()) {
        return trialsApi.getById(id) as Promise<TrialBooking | null>;
      }
      return getById<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, id);
    },

    create: async (data: Omit<TrialBooking, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrialBooking> => {
      if (isApiMode()) {
        return trialsApi.create(data as any) as Promise<TrialBooking>;
      }
      return create<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, data);
    },

    update: async (id: string, data: Partial<TrialBooking>): Promise<TrialBooking | null> => {
      if (isApiMode()) {
        return trialsApi.update(id, data as any) as Promise<TrialBooking | null>;
      }
      return update<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, id, data);
    },

    delete: async (id: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await trialsApi.delete(id);
        return result.deleted;
      }
      return remove<TrialBooking>(STORAGE_KEYS.TRIAL_BOOKINGS, id);
    },
  },
};
