/**
 * Membership Subscription Service
 * Dual-mode: localStorage (default) or API
 */

import { isApiMode, subscriptionsApi } from '../api';
import type { MembershipSubscription, Invoice, Member } from '../../types';
import {
  STORAGE_KEYS,
  SUBSCRIPTION_EXPIRY_WINDOW_DAYS,
  SUBSCRIPTION_RECENTLY_EXPIRED_DAYS,
} from '../../constants';
import { getAll, getById, create, update, remove, saveAll, createDual, updateDual, removeDual } from './helpers';
import { calculateSubscriptionEndDate } from '../../utils/dateUtils';
import { memberService } from './memberService';
import { membershipPlanService } from './planService';
import { slotService, slotSubscriptionService } from './slotService';
import { invoiceService } from './invoiceService';

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

  getExpiringSoon: (daysAhead: number = SUBSCRIPTION_EXPIRY_WINDOW_DAYS): MembershipSubscription[] => {
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
  getRecentlyExpired: (daysBack: number = SUBSCRIPTION_RECENTLY_EXPIRED_DAYS): MembershipSubscription[] => {
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

  // Get subscriptions for a slot on a specific date (includes expired for historical attendance)
  getActiveForSlotOnDate: (slotId: string, date: string): MembershipSubscription[] => {
    const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
    // Include 'expired' subscriptions so members still appear on attendance page
    // for past dates within their old subscription period (e.g., after renewal).
    return subscriptions.filter(s =>
      s.slotId === slotId &&
      (s.status === 'active' || s.status === 'expired') &&
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

    getExpiringSoon: async (daysAhead: number = SUBSCRIPTION_EXPIRY_WINDOW_DAYS): Promise<MembershipSubscription[]> => {
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
        (s.status === 'active' || s.status === 'expired') &&
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

      // Link invoice back to subscription (critical for edit/update flow)
      await subscriptionService.async.update(subscription.id, { invoiceId: invoice.id });

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

      // Update subscriptions in localStorage (include invoiceId link)
      const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
      subscriptions.push({ ...subscription, invoiceId: invoice.id });
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
