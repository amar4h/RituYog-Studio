/**
 * Backup Service
 */

import { STORAGE_KEYS } from '../../constants';
import { saveAll } from './helpers';
import { memberService } from './memberService';
import { leadService } from './leadService';
import { membershipPlanService } from './planService';
import { subscriptionService } from './subscriptionService';
import { slotService, slotSubscriptionService } from './slotService';
import { invoiceService } from './invoiceService';
import { paymentService } from './paymentService';
import { trialBookingService } from './trialBookingService';
import { settingsService } from './settingsService';

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
