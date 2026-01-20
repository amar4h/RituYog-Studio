/**
 * Yoga Studio Management - Supabase Storage Service
 * Provides CRUD operations with Supabase persistence
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
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
} from '../types';

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert object keys from snake_case to camelCase
function keysToCamelCase<T>(obj: Record<string, unknown>): T {
  if (obj === null || typeof obj !== 'object') return obj as T;
  if (Array.isArray(obj)) return obj.map(item => keysToCamelCase(item)) as T;

  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    const camelKey = toCamelCase(key);
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      newObj[camelKey] = keysToCamelCase(value as Record<string, unknown>);
    } else {
      newObj[camelKey] = value;
    }
  }
  return newObj as T;
}

// Convert object keys from camelCase to snake_case
function keysToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => keysToSnakeCase(item as Record<string, unknown>)) as unknown as Record<string, unknown>;

  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    // Skip id, createdAt, updatedAt for inserts
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') {
      if (key === 'id' && obj[key]) {
        newObj[key] = obj[key]; // Keep id for updates
      }
      continue;
    }
    const snakeKey = toSnakeCase(key);
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      newObj[snakeKey] = value; // Keep JSONB objects as-is
    } else {
      newObj[snakeKey] = value;
    }
  }
  return newObj;
}

// ============================================
// GENERIC CRUD OPERATIONS
// ============================================

async function getAll<T>(table: string): Promise<T[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching from ${table}:`, error);
    return [];
  }

  return (data || []).map(item => keysToCamelCase<T>(item));
}

async function getById<T>(table: string, id: string): Promise<T | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching ${table} by id:`, error);
    return null;
  }

  return data ? keysToCamelCase<T>(data) : null;
}

async function create<T>(
  table: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<T | null> {
  if (!supabase) return null;

  const snakeCaseData = keysToSnakeCase(data as Record<string, unknown>);

  const { data: result, error } = await supabase
    .from(table)
    .insert(snakeCaseData)
    .select()
    .single();

  if (error) {
    console.error(`Error creating in ${table}:`, error);
    throw new Error(error.message);
  }

  return result ? keysToCamelCase<T>(result) : null;
}

async function update<T>(
  table: string,
  id: string,
  data: Partial<T>
): Promise<T | null> {
  if (!supabase) return null;

  const snakeCaseData = keysToSnakeCase(data as Record<string, unknown>);

  const { data: result, error } = await supabase
    .from(table)
    .update(snakeCaseData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating ${table}:`, error);
    throw new Error(error.message);
  }

  return result ? keysToCamelCase<T>(result) : null;
}

async function remove(table: string, id: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting from ${table}:`, error);
    return false;
  }

  return true;
}

// ============================================
// MEMBER SERVICE
// ============================================

export const supabaseMemberService = {
  getAll: () => getAll<Member>('members'),
  getById: (id: string) => getById<Member>('members', id),
  create: (data: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Member>('members', data),
  update: (id: string, data: Partial<Member>) =>
    update<Member>('members', id, data),
  delete: (id: string) => remove('members', id),

  getByEmail: async (email: string): Promise<Member | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .ilike('email', email)
      .single();
    if (error) return null;
    return data ? keysToCamelCase<Member>(data) : null;
  },

  getByPhone: async (phone: string): Promise<Member | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .single();
    if (error) return null;
    return data ? keysToCamelCase<Member>(data) : null;
  },

  getByStatus: async (status: Member['status']): Promise<Member[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', status);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Member>(item));
  },

  getBySlot: async (slotId: string): Promise<Member[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('assigned_slot_id', slotId);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Member>(item));
  },

  getActive: async (): Promise<Member[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active');
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Member>(item));
  },

  search: async (query: string): Promise<Member[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Member>(item));
  },
};

// ============================================
// LEAD SERVICE
// ============================================

export const supabaseLeadService = {
  getAll: () => getAll<Lead>('leads'),
  getById: (id: string) => getById<Lead>('leads', id),
  create: (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Lead>('leads', data),
  update: (id: string, data: Partial<Lead>) =>
    update<Lead>('leads', id, data),
  delete: (id: string) => remove('leads', id),

  getByEmail: async (email: string): Promise<Lead | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .ilike('email', email)
      .single();
    if (error) return null;
    return data ? keysToCamelCase<Lead>(data) : null;
  },

  getByPhone: async (phone: string): Promise<Lead | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .single();
    if (error) return null;
    return data ? keysToCamelCase<Lead>(data) : null;
  },

  getByStatus: async (status: Lead['status']): Promise<Lead[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', status);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Lead>(item));
  },

  getPending: async (): Promise<Lead[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .in('status', ['new', 'contacted', 'trial-scheduled', 'follow-up', 'interested']);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Lead>(item));
  },

  getForFollowUp: async (): Promise<Lead[]> => {
    if (!supabase) return [];
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .lte('next_follow_up_date', today)
      .not('status', 'in', '("converted","not-interested","lost")');
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Lead>(item));
  },

  search: async (query: string): Promise<Lead[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Lead>(item));
  },

  convertToMember: async (leadId: string): Promise<Member | null> => {
    const lead = await supabaseLeadService.getById(leadId);
    if (!lead) throw new Error('Lead not found');
    if (lead.convertedToMemberId) throw new Error('Lead already converted');

    const existingMember = await supabaseMemberService.getByEmail(lead.email);
    if (existingMember) throw new Error('A member with this email already exists');

    const emergencyContact = lead.emergencyContact || lead.emergencyPhone
      ? { name: lead.emergencyContact || '', phone: lead.emergencyPhone || '' }
      : undefined;

    const member = await supabaseMemberService.create({
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

    if (member) {
      await supabaseLeadService.update(leadId, {
        status: 'converted',
        convertedToMemberId: member.id,
        conversionDate: new Date().toISOString(),
      });
    }

    return member;
  },
};

// ============================================
// MEMBERSHIP PLAN SERVICE
// ============================================

export const supabaseMembershipPlanService = {
  getAll: () => getAll<MembershipPlan>('membership_plans'),
  getById: (id: string) => getById<MembershipPlan>('membership_plans', id),
  create: (data: Omit<MembershipPlan, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<MembershipPlan>('membership_plans', data),
  update: (id: string, data: Partial<MembershipPlan>) =>
    update<MembershipPlan>('membership_plans', id, data),
  delete: (id: string) => remove('membership_plans', id),

  getActive: async (): Promise<MembershipPlan[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<MembershipPlan>(item));
  },
};

// ============================================
// SUBSCRIPTION SERVICE
// ============================================

export const supabaseSubscriptionService = {
  getAll: () => getAll<MembershipSubscription>('subscriptions'),
  getById: (id: string) => getById<MembershipSubscription>('subscriptions', id),
  create: (data: Omit<MembershipSubscription, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<MembershipSubscription>('subscriptions', data),
  update: (id: string, data: Partial<MembershipSubscription>) =>
    update<MembershipSubscription>('subscriptions', id, data),
  delete: (id: string) => remove('subscriptions', id),

  getByMember: async (memberId: string): Promise<MembershipSubscription[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', memberId)
      .order('start_date', { ascending: false });
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<MembershipSubscription>(item));
  },

  getActiveMemberSubscription: async (memberId: string): Promise<MembershipSubscription | null> => {
    if (!supabase) return null;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .lte('start_date', today)
      .gte('end_date', today)
      .single();
    if (error) return null;
    return data ? keysToCamelCase<MembershipSubscription>(data) : null;
  },

  getExpiringSoon: async (daysAhead: number = 7): Promise<MembershipSubscription[]> => {
    if (!supabase) return [];
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('end_date', futureDate.toISOString().split('T')[0]);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<MembershipSubscription>(item));
  },

  hasActiveSubscription: async (memberId: string): Promise<boolean> => {
    const subscription = await supabaseSubscriptionService.getActiveMemberSubscription(memberId);
    return subscription !== null;
  },

  // Get active subscriptions for a slot on a specific date
  getActiveForSlotOnDate: async (slotId: string, date: string): Promise<MembershipSubscription[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('slot_id', slotId)
      .eq('status', 'active')
      .lte('start_date', date)
      .gte('end_date', date);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<MembershipSubscription>(item));
  },

  createWithInvoice: async (
    memberId: string,
    planId: string,
    slotId: string,
    startDate: string,
    discountAmount: number = 0,
    discountReason?: string,
    notes?: string
  ): Promise<{ subscription: MembershipSubscription; invoice: Invoice }> => {
    const plan = await supabaseMembershipPlanService.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const member = await supabaseMemberService.getById(memberId);
    if (!member) throw new Error('Member not found');

    // Calculate end date
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + plan.durationMonths);
    const endDate = end.toISOString().split('T')[0];

    // Calculate amounts
    const originalAmount = plan.price;
    const payableAmount = Math.max(0, originalAmount - discountAmount);

    // Create subscription
    const subscription = await supabaseSubscriptionService.create({
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

    if (!subscription) throw new Error('Failed to create subscription');

    // Create invoice
    const invoice = await supabaseInvoiceService.create({
      invoiceNumber: await supabaseInvoiceService.generateInvoiceNumber(),
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
          description: `${plan.name} Membership (${plan.durationMonths} ${plan.durationMonths === 1 ? 'month' : 'months'})`,
          quantity: 1,
          unitPrice: originalAmount,
          total: originalAmount,
        },
      ],
      subscriptionId: subscription.id,
    });

    if (!invoice) throw new Error('Failed to create invoice');

    // Update subscription with invoice ID
    await supabaseSubscriptionService.update(subscription.id, { invoiceId: invoice.id });

    // Update member status to active
    await supabaseMemberService.update(memberId, { status: 'active' });

    return { subscription: { ...subscription, invoiceId: invoice.id }, invoice };
  },

  extendSubscription: async (
    subscriptionId: string,
    extensionDays: number,
    reason?: string
  ): Promise<MembershipSubscription | null> => {
    const subscription = await supabaseSubscriptionService.getById(subscriptionId);
    if (!subscription) return null;

    const currentEnd = new Date(subscription.endDate);
    currentEnd.setDate(currentEnd.getDate() + extensionDays);
    const newEndDate = currentEnd.toISOString().split('T')[0];

    return supabaseSubscriptionService.update(subscriptionId, {
      endDate: newEndDate,
      extensionDays: (subscription.extensionDays || 0) + extensionDays,
      notes: subscription.notes
        ? `${subscription.notes}\nExtended by ${extensionDays} days: ${reason || 'No reason provided'}`
        : `Extended by ${extensionDays} days: ${reason || 'No reason provided'}`,
    });
  },
};

// ============================================
// SESSION SLOT SERVICE
// ============================================

export const supabaseSlotService = {
  getAll: () => getAll<SessionSlot>('session_slots'),
  getById: (id: string) => getById<SessionSlot>('session_slots', id),
  update: (id: string, data: Partial<SessionSlot>) =>
    update<SessionSlot>('session_slots', id, data),

  getActive: async (): Promise<SessionSlot[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('session_slots')
      .select('*')
      .eq('is_active', true);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<SessionSlot>(item));
  },

  getSlotAvailability: async (slotId: string, date: string): Promise<SlotAvailability> => {
    const slot = await supabaseSlotService.getById(slotId);
    if (!slot) throw new Error('Slot not found');

    // Get active membership subscriptions for the specific date
    const membershipSubs = await supabaseSubscriptionService.getActiveForSlotOnDate(slotId, date);

    // Also check SlotSubscription for exception bookings (admin overrides)
    const slotSubscriptions = await supabaseSlotSubscriptionService.getActiveForSlot(slotId, date);
    const exceptionSubs = slotSubscriptions.filter(s => s.isException);

    const trialBookings = await supabaseTrialBookingService.getBySlotAndDate(slotId, date);
    const activeTrials = trialBookings.filter(t => ['pending', 'confirmed'].includes(t.status));

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

  getAllSlotsAvailability: async (date: string): Promise<SlotAvailability[]> => {
    const slots = await supabaseSlotService.getActive();
    return Promise.all(slots.map(slot => supabaseSlotService.getSlotAvailability(slot.id, date)));
  },

  hasCapacity: async (slotId: string, date: string, useException: boolean = false): Promise<boolean> => {
    const availability = await supabaseSlotService.getSlotAvailability(slotId, date);
    if (useException) {
      return availability.availableException > 0;
    }
    return availability.availableRegular > 0;
  },
};

// ============================================
// SLOT SUBSCRIPTION SERVICE
// ============================================

export const supabaseSlotSubscriptionService = {
  getAll: () => getAll<SlotSubscription>('slot_subscriptions'),
  getById: (id: string) => getById<SlotSubscription>('slot_subscriptions', id),
  create: (data: Omit<SlotSubscription, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<SlotSubscription>('slot_subscriptions', data),
  update: (id: string, data: Partial<SlotSubscription>) =>
    update<SlotSubscription>('slot_subscriptions', id, data),
  delete: (id: string) => remove('slot_subscriptions', id),

  getByMember: async (memberId: string): Promise<SlotSubscription | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('slot_subscriptions')
      .select('*')
      .eq('member_id', memberId)
      .eq('is_active', true)
      .single();
    if (error) return null;
    return data ? keysToCamelCase<SlotSubscription>(data) : null;
  },

  getActiveForSlot: async (slotId: string, date?: string): Promise<SlotSubscription[]> => {
    if (!supabase) return [];
    let query = supabase
      .from('slot_subscriptions')
      .select('*')
      .eq('slot_id', slotId)
      .eq('is_active', true);

    // If date is provided, filter subscriptions that cover that date
    if (date) {
      query = query
        .or(`start_date.is.null,start_date.lte.${date}`)
        .or(`end_date.is.null,end_date.gte.${date}`);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<SlotSubscription>(item));
  },

  subscribe: async (
    memberId: string,
    slotId: string,
    isException: boolean = false,
    notes?: string
  ): Promise<SlotSubscription | null> => {
    const existing = await supabaseSlotSubscriptionService.getByMember(memberId);
    if (existing) throw new Error('Member already has an assigned slot. Deactivate first.');

    const today = new Date().toISOString().split('T')[0];
    const hasCapacity = await supabaseSlotService.hasCapacity(slotId, today, isException);
    if (!hasCapacity) throw new Error(isException ? 'Exception capacity full' : 'Slot is at capacity');

    const subscription = await supabaseSlotSubscriptionService.create({
      memberId,
      slotId,
      startDate: today,
      isActive: true,
      isException,
      notes,
    });

    if (subscription) {
      await supabaseMemberService.update(memberId, { assignedSlotId: slotId });
    }

    return subscription;
  },

  changeSlot: async (
    memberId: string,
    newSlotId: string,
    isException: boolean = false
  ): Promise<SlotSubscription | null> => {
    await supabaseSlotSubscriptionService.deactivate(memberId);
    return supabaseSlotSubscriptionService.subscribe(memberId, newSlotId, isException);
  },

  deactivate: async (memberId: string): Promise<void> => {
    const subscription = await supabaseSlotSubscriptionService.getByMember(memberId);
    if (subscription) {
      await supabaseSlotSubscriptionService.update(subscription.id, {
        isActive: false,
        endDate: new Date().toISOString().split('T')[0],
      });
    }
  },
};

// ============================================
// INVOICE SERVICE
// ============================================

export const supabaseInvoiceService = {
  getAll: () => getAll<Invoice>('invoices'),
  getById: (id: string) => getById<Invoice>('invoices', id),
  create: (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Invoice>('invoices', data),
  update: (id: string, data: Partial<Invoice>) =>
    update<Invoice>('invoices', id, data),
  delete: (id: string) => remove('invoices', id),

  getByMember: async (memberId: string): Promise<Invoice[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('member_id', memberId)
      .order('invoice_date', { ascending: false });
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Invoice>(item));
  },

  getPending: async (): Promise<Invoice[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .in('status', ['sent', 'partially-paid', 'overdue']);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Invoice>(item));
  },

  getOverdue: async (): Promise<Invoice[]> => {
    if (!supabase) return [];
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .in('status', ['sent', 'partially-paid'])
      .lt('due_date', today);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Invoice>(item));
  },

  generateInvoiceNumber: async (): Promise<string> => {
    const settings = await supabaseSettingsService.getOrDefault();
    const invoices = await supabaseInvoiceService.getAll();
    const prefix = settings?.invoicePrefix || 'INV';
    const nextNumber = invoices.length + 1;
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  },
};

// ============================================
// PAYMENT SERVICE
// ============================================

export const supabasePaymentService = {
  getAll: () => getAll<Payment>('payments'),
  getById: (id: string) => getById<Payment>('payments', id),
  create: (data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Payment>('payments', data),
  update: (id: string, data: Partial<Payment>) =>
    update<Payment>('payments', id, data),
  delete: (id: string) => remove('payments', id),

  getByInvoice: async (invoiceId: string): Promise<Payment[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Payment>(item));
  },

  getByMember: async (memberId: string): Promise<Payment[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', memberId)
      .order('payment_date', { ascending: false });
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<Payment>(item));
  },

  generateReceiptNumber: async (): Promise<string> => {
    const settings = await supabaseSettingsService.getOrDefault();
    const payments = await supabasePaymentService.getAll();
    const prefix = settings?.receiptPrefix || 'RCP';
    const nextNumber = payments.length + 1;
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  },

  recordPayment: async (
    invoiceId: string,
    amount: number,
    paymentMethod: Payment['paymentMethod'],
    paymentDate?: string,
    transactionReference?: string,
    notes?: string
  ): Promise<Payment | null> => {
    const invoice = await supabaseInvoiceService.getById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const payment = await supabasePaymentService.create({
      invoiceId,
      memberId: invoice.memberId,
      amount,
      paymentMethod,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      transactionReference,
      status: 'completed',
      receiptNumber: await supabasePaymentService.generateReceiptNumber(),
      notes,
    });

    // Update invoice
    const totalPaid = (invoice.amountPaid || 0) + amount;
    const newStatus = totalPaid >= invoice.totalAmount ? 'paid' : 'partially-paid';

    await supabaseInvoiceService.update(invoiceId, {
      amountPaid: totalPaid,
      status: newStatus,
      paidDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
      paymentMethod,
      paymentReference: transactionReference,
    });

    // Update subscription payment status if linked
    if (invoice.subscriptionId) {
      await supabaseSubscriptionService.update(invoice.subscriptionId, {
        paymentStatus: newStatus === 'paid' ? 'paid' : 'partial',
      });
    }

    return payment;
  },

  getRevenue: async (startDate: string, endDate: string): Promise<number> => {
    if (!supabase) return 0;
    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);
    if (error) return 0;
    return (data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  },
};

// ============================================
// TRIAL BOOKING SERVICE
// ============================================

export const supabaseTrialBookingService = {
  getAll: () => getAll<TrialBooking>('trial_bookings'),
  getById: (id: string) => getById<TrialBooking>('trial_bookings', id),
  create: (data: Omit<TrialBooking, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<TrialBooking>('trial_bookings', data),
  update: (id: string, data: Partial<TrialBooking>) =>
    update<TrialBooking>('trial_bookings', id, data),
  delete: (id: string) => remove('trial_bookings', id),

  getByLead: async (leadId: string): Promise<TrialBooking[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('trial_bookings')
      .select('*')
      .eq('lead_id', leadId);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<TrialBooking>(item));
  },

  getBySlotAndDate: async (slotId: string, date: string): Promise<TrialBooking[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('trial_bookings')
      .select('*')
      .eq('slot_id', slotId)
      .eq('date', date);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<TrialBooking>(item));
  },

  getUpcoming: async (): Promise<TrialBooking[]> => {
    if (!supabase) return [];
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('trial_bookings')
      .select('*')
      .gte('date', today)
      .in('status', ['pending', 'confirmed']);
    if (error) return [];
    return (data || []).map(item => keysToCamelCase<TrialBooking>(item));
  },

  bookTrial: async (
    leadId: string,
    slotId: string,
    date: string,
    isException: boolean = false
  ): Promise<TrialBooking | null> => {
    const lead = await supabaseLeadService.getById(leadId);
    if (!lead) throw new Error('Lead not found');

    const existingTrials = await supabaseTrialBookingService.getByLead(leadId);
    const settings = await supabaseSettingsService.getOrDefault();
    const completedTrials = existingTrials.filter(t => ['attended', 'no-show'].includes(t.status));
    if (completedTrials.length >= settings.maxTrialsPerPerson) {
      throw new Error('Maximum trial sessions reached');
    }

    const hasCapacity = await supabaseSlotService.hasCapacity(slotId, date, isException);
    if (!hasCapacity) {
      throw new Error(isException ? 'Exception capacity full' : 'Slot is full for this date');
    }

    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new Error('Sessions only available Monday to Friday');
    }

    const booking = await supabaseTrialBookingService.create({
      leadId,
      slotId,
      date,
      status: 'confirmed',
      isException,
      confirmationSent: false,
      reminderSent: false,
    });

    if (booking) {
      await supabaseLeadService.update(leadId, {
        status: 'trial-scheduled',
        trialDate: date,
        trialSlotId: slotId,
        trialStatus: 'scheduled',
      });
    }

    return booking;
  },

  markAttended: async (bookingId: string): Promise<TrialBooking | null> => {
    const booking = await supabaseTrialBookingService.getById(bookingId);
    if (!booking) return null;

    const updated = await supabaseTrialBookingService.update(bookingId, { status: 'attended' });

    await supabaseLeadService.update(booking.leadId, {
      status: 'trial-completed',
      trialStatus: 'attended',
    });

    return updated;
  },

  markNoShow: async (bookingId: string): Promise<TrialBooking | null> => {
    const booking = await supabaseTrialBookingService.getById(bookingId);
    if (!booking) return null;

    const updated = await supabaseTrialBookingService.update(bookingId, { status: 'no-show' });

    await supabaseLeadService.update(booking.leadId, {
      status: 'follow-up',
      trialStatus: 'no-show',
    });

    return updated;
  },
};

// ============================================
// SETTINGS SERVICE
// ============================================

export const supabaseSettingsService = {
  get: async (): Promise<StudioSettings | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('studio_settings')
      .select('*')
      .limit(1)
      .single();
    if (error) return null;
    return data ? keysToCamelCase<StudioSettings>(data) : null;
  },

  save: async (settings: StudioSettings): Promise<void> => {
    if (!supabase) return;
    const existing = await supabaseSettingsService.get();
    const snakeCaseData = keysToSnakeCase(settings as unknown as Record<string, unknown>);

    if (existing) {
      await supabase
        .from('studio_settings')
        .update(snakeCaseData)
        .eq('id', (existing as unknown as { id: string }).id);
    } else {
      await supabase.from('studio_settings').insert(snakeCaseData);
    }
  },

  getOrDefault: async (): Promise<StudioSettings> => {
    const existing = await supabaseSettingsService.get();
    if (existing) return existing;

    // Return default settings
    return {
      studioName: 'Yoga Studio',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      workingHours: {
        monday: [{ start: '06:00', end: '18:00' }],
        tuesday: [{ start: '06:00', end: '18:00' }],
        wednesday: [{ start: '06:00', end: '18:00' }],
        thursday: [{ start: '06:00', end: '18:00' }],
        friday: [{ start: '06:00', end: '18:00' }],
        saturday: [],
        sunday: [],
      },
      termsAndConditions: '',
      healthDisclaimer: '',
      renewalReminderDays: 7,
      classReminderHours: 24,
      invoicePrefix: 'INV',
      receiptPrefix: 'RCP',
      trialClassEnabled: true,
      maxTrialsPerPerson: 1,
      holidays: [],
    };
  },

  updatePartial: async (updates: Partial<StudioSettings>): Promise<StudioSettings> => {
    const current = await supabaseSettingsService.getOrDefault();
    const updated = { ...current, ...updates };
    await supabaseSettingsService.save(updated);
    return updated;
  },
};

// ============================================
// AUTH SERVICE
// ============================================

export const supabaseAuthService = {
  login: async (password: string): Promise<boolean> => {
    const settings = await supabaseSettingsService.getOrDefault();
    const adminPassword = settings.adminPassword || 'admin123';

    if (password === adminPassword) {
      localStorage.setItem('yoga_studio_auth', JSON.stringify({
        isAuthenticated: true,
        loginTime: new Date().toISOString(),
      }));
      return true;
    }
    return false;
  },

  logout: (): void => {
    localStorage.removeItem('yoga_studio_auth');
  },

  isAuthenticated: (): boolean => {
    try {
      const data = localStorage.getItem('yoga_studio_auth');
      if (!data) return false;
      const auth = JSON.parse(data);
      return auth.isAuthenticated === true;
    } catch {
      return false;
    }
  },

  changePassword: async (newPassword: string): Promise<void> => {
    await supabaseSettingsService.updatePartial({ adminPassword: newPassword });
  },
};

// ============================================
// CHECK IF SUPABASE IS CONFIGURED
// ============================================

export { isSupabaseConfigured };
