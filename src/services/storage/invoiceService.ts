/**
 * Invoice Service
 * Dual-mode: localStorage (default) or API
 */

import { isApiMode, invoicesApi } from '../api';
import type { Invoice } from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { getAll, getById, create, update, remove, saveAll, createDual, updateDual, removeDual } from './helpers';
import { settingsService } from './settingsService';

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

  // Find invoice by subscriptionId (to prevent duplicates)
  getBySubscriptionId: (subscriptionId: string): Invoice | null => {
    const invoices = getAll<Invoice>(STORAGE_KEYS.INVOICES);
    return invoices.find(i => i.subscriptionId === subscriptionId) || null;
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
    return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
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
