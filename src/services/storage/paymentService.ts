/**
 * Payment Service
 * Dual-mode: localStorage (default) or API
 */

import { isApiMode, paymentsApi, invoicesApi } from '../api';
import type { Payment } from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { getAll, getById, create, update, remove, createDual, updateDual, removeDual } from './helpers';
import { settingsService } from './settingsService';
import { invoiceService } from './invoiceService';
import { subscriptionService } from './subscriptionService';

export const paymentService = {
  // Synchronous methods - dual-mode (localStorage + API queue)
  getAll: () => getAll<Payment>(STORAGE_KEYS.PAYMENTS),
  getById: (id: string) => getById<Payment>(STORAGE_KEYS.PAYMENTS, id),
  create: (data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Payment>(STORAGE_KEYS.PAYMENTS, data),
  update: (id: string, data: Partial<Payment>) =>
    updateDual<Payment>(STORAGE_KEYS.PAYMENTS, id, data),
  delete: (id: string) => removeDual<Payment>(STORAGE_KEYS.PAYMENTS, id),

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
    const startNumber = settings?.receiptStartNumber || 1;

    // Find the highest existing receipt number
    let maxNumber = 0;
    const prefixWithDash = prefix + '-';
    payments.forEach(pmt => {
      if (pmt.receiptNumber && pmt.receiptNumber.startsWith(prefixWithDash)) {
        const numPart = parseInt(pmt.receiptNumber.substring(prefixWithDash.length), 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    });

    // Next number is max of (highest existing, startNumber - 1) + 1
    const nextNumber = Math.max(maxNumber, startNumber - 1) + 1;
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

    // Update invoice - ensure numeric comparison (API may return strings)
    const totalPaid = Number(invoice.amountPaid || 0) + amount;
    const invoiceTotal = Number(invoice.totalAmount || 0);
    const newStatus = totalPaid >= invoiceTotal ? 'paid' : 'partially-paid';

    const actualPaymentDate = paymentDate || new Date().toISOString().split('T')[0];
    invoiceService.update(invoiceId, {
      amountPaid: totalPaid,
      status: newStatus,
      paidDate: newStatus === 'paid' ? actualPaymentDate : undefined,
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
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
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
        return Number(result.revenue || 0);
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

        const actualPaymentDate = paymentDate || new Date().toISOString().split('T')[0];
        const receiptNumber = await paymentService.async.generateReceiptNumber();
        const payment = await paymentService.async.create({
          invoiceId,
          memberId: invoice.memberId,
          amount,
          paymentMethod,
          paymentDate: actualPaymentDate,
          transactionReference,
          status: 'completed',
          receiptNumber,
          notes,
        });

        // Update invoice via API - ensure numeric comparison (API may return strings)
        const totalPaid = Number(invoice.amountPaid || 0) + amount;
        const invoiceTotal = Number(invoice.totalAmount || 0);
        const newStatus = totalPaid >= invoiceTotal ? 'paid' : 'partially-paid';
        await invoicesApi.updatePaymentStatus(invoiceId, {
          amountPaid: totalPaid,
          status: newStatus,
          paymentMethod,
          paymentReference: transactionReference,
          paidDate: newStatus === 'paid' ? actualPaymentDate : undefined,
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
