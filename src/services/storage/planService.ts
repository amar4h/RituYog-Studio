/**
 * Membership Plan Service
 * Dual-mode: localStorage (default) or API
 */

import { isApiMode, plansApi } from '../api';
import type { MembershipPlan } from '../../types';
import { STORAGE_KEYS, DEFAULT_MEMBERSHIP_PLANS } from '../../constants';
import { getAll, getById, create, update, remove, createDual, updateDual, removeDual } from './helpers';

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

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // Use these in React Query or async contexts
  // ============================================
  async: {
    getAll: async (): Promise<MembershipPlan[]> => {
      if (isApiMode()) {
        return plansApi.getAll() as Promise<MembershipPlan[]>;
      }
      return getAll<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS);
    },

    getById: async (id: string): Promise<MembershipPlan | null> => {
      if (isApiMode()) {
        return plansApi.getById(id) as Promise<MembershipPlan | null>;
      }
      return getById<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, id);
    },

    create: async (data: Omit<MembershipPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<MembershipPlan> => {
      if (isApiMode()) {
        return plansApi.create(data as any) as Promise<MembershipPlan>;
      }
      return create<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, data);
    },

    update: async (id: string, data: Partial<MembershipPlan>): Promise<MembershipPlan | null> => {
      if (isApiMode()) {
        return plansApi.update(id, data as any) as Promise<MembershipPlan | null>;
      }
      return update<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, id, data);
    },

    delete: async (id: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await plansApi.delete(id);
        return result.deleted;
      }
      return remove<MembershipPlan>(STORAGE_KEYS.MEMBERSHIP_PLANS, id);
    },
  },
};
