/**
 * Member Service
 * Dual-mode: localStorage (default) or API
 */

import { isApiMode, membersApi } from '../api';
import type { Member, MembershipSubscription } from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { getAll, getById, create, update, remove, createDual, updateDual, removeDual } from './helpers';

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

  // Reconcile member and subscription statuses based on actual dates
  // Updates stale subscription status to 'expired' and member status accordingly
  reconcileStatuses: (): void => {
    const today = new Date().toISOString().split('T')[0];
    const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
    const subscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);

    // First: update stale subscription statuses
    for (const sub of subscriptions) {
      if (sub.status === 'active' && sub.endDate < today) {
        updateDual<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS, sub.id, { status: 'expired' as MembershipSubscription['status'] });
      }
    }

    // Then: update member statuses (re-read subscriptions after status updates above)
    const updatedSubscriptions = getAll<MembershipSubscription>(STORAGE_KEYS.SUBSCRIPTIONS);
    for (const member of members) {
      if (member.status !== 'active' && member.status !== 'expired') continue;

      const memberSubs = updatedSubscriptions.filter(s => s.memberId === member.id);

      // Check if member has any currently active or future subscription
      const hasActiveOrFuture = memberSubs.some(s =>
        (s.status === 'active' && s.startDate <= today && s.endDate >= today) ||
        (s.status === 'scheduled') ||
        (s.status === 'active' && s.startDate > today)
      );

      if (hasActiveOrFuture && member.status !== 'active') {
        updateDual<Member>(STORAGE_KEYS.MEMBERS, member.id, { status: 'active' as Member['status'] });
      } else if (!hasActiveOrFuture && member.status === 'active') {
        updateDual<Member>(STORAGE_KEYS.MEMBERS, member.id, { status: 'expired' as Member['status'] });
      }
    }
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
