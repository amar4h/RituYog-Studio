/**
 * Membership Plan Service
 */

import type { MembershipPlan } from '../../types';
import { STORAGE_KEYS, DEFAULT_MEMBERSHIP_PLANS } from '../../constants';
import { getAll, getById, createDual, updateDual, removeDual } from './helpers';

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
