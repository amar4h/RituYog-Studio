import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { invoiceService, memberService, settingsService, paymentService, subscriptionService, membershipPlanService } from '../services';
import { generateInvoicePDF, downloadInvoicePDF } from '../utils/pdfUtils';
import type { Invoice } from '../types';

interface InvoiceContextType {
  // Data
  invoices: Invoice[];
  pendingInvoices: Invoice[];
  overdueInvoices: Invoice[];
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshInvoices: () => void;
  getInvoiceById: (id: string) => Invoice | null;
  getInvoicesByMember: (memberId: string) => Invoice[];
  createInvoice: (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Invoice;
  updateInvoice: (id: string, data: Partial<Invoice>) => Invoice;
  deleteInvoice: (id: string) => void;
  generateInvoiceNumber: () => string;

  // PDF operations
  downloadPdf: (invoiceId: string) => Promise<void>;
  previewPdf: (invoiceId: string) => Promise<Blob | null>;

  // Filters
  filterByStatus: (status: Invoice['status'] | 'all') => Invoice[];
  filterByDateRange: (from: string, to: string) => Invoice[];
  searchInvoices: (query: string) => Invoice[];
}

export const InvoiceContext = createContext<InvoiceContextType | null>(null);

interface InvoiceProviderProps {
  children: ReactNode;
}

export function InvoiceProvider({ children }: InvoiceProviderProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load invoices
  const refreshInvoices = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const data = invoiceService.getAll();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Derived data
  const pendingInvoices = invoices.filter(i =>
    ['sent', 'partially-paid', 'overdue'].includes(i.status)
  );

  const overdueInvoices = invoices.filter(i => {
    const today = new Date().toISOString().split('T')[0];
    return ['sent', 'partially-paid'].includes(i.status) && i.dueDate < today;
  });

  // Get single invoice
  const getInvoiceById = useCallback((id: string): Invoice | null => {
    return invoiceService.getById(id);
  }, []);

  // Get invoices by member
  const getInvoicesByMember = useCallback((memberId: string): Invoice[] => {
    return invoiceService.getByMember(memberId);
  }, []);

  // Create invoice
  const createInvoice = useCallback((data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Invoice => {
    const invoice = invoiceService.create(data);
    refreshInvoices();
    return invoice;
  }, [refreshInvoices]);

  // Update invoice
  const updateInvoice = useCallback((id: string, data: Partial<Invoice>): Invoice => {
    const invoice = invoiceService.update(id, data);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    refreshInvoices();
    return invoice;
  }, [refreshInvoices]);

  // Delete invoice
  const deleteInvoice = useCallback((id: string): void => {
    invoiceService.delete(id);
    refreshInvoices();
  }, [refreshInvoices]);

  // Generate invoice number
  const generateInvoiceNumber = useCallback((): string => {
    return invoiceService.generateInvoiceNumber();
  }, []);

  // Download PDF
  const downloadPdf = useCallback(async (invoiceId: string): Promise<void> => {
    const invoice = invoiceService.getById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const member = memberService.getById(invoice.memberId);
    const settings = settingsService.get();

    if (!settings) {
      throw new Error('Studio settings not found');
    }

    // Get related data for PDF
    const payments = paymentService.getByInvoice(invoice.id);
    const subscription = invoice.subscriptionId
      ? subscriptionService.getById(invoice.subscriptionId)
      : null;
    const plan = subscription?.planId
      ? membershipPlanService.getById(subscription.planId)
      : null;

    await downloadInvoicePDF({
      invoice,
      member: member || null,
      subscription,
      plan,
      payments,
      settings,
    });
  }, []);

  // Preview PDF (returns Blob)
  const previewPdf = useCallback(async (invoiceId: string): Promise<Blob | null> => {
    const invoice = invoiceService.getById(invoiceId);
    if (!invoice) {
      return null;
    }

    const member = memberService.getById(invoice.memberId);
    const settings = settingsService.get();

    if (!settings) {
      return null;
    }

    // Get related data for PDF
    const payments = paymentService.getByInvoice(invoice.id);
    const subscription = invoice.subscriptionId
      ? subscriptionService.getById(invoice.subscriptionId)
      : null;
    const plan = subscription?.planId
      ? membershipPlanService.getById(subscription.planId)
      : null;

    return generateInvoicePDF({
      invoice,
      member: member || null,
      subscription,
      plan,
      payments,
      settings,
    });
  }, []);

  // Filter by status
  const filterByStatus = useCallback((status: Invoice['status'] | 'all'): Invoice[] => {
    if (status === 'all') {
      return invoices;
    }
    return invoices.filter(i => i.status === status);
  }, [invoices]);

  // Filter by date range
  const filterByDateRange = useCallback((from: string, to: string): Invoice[] => {
    return invoices.filter(i =>
      i.invoiceDate >= from && i.invoiceDate <= to
    );
  }, [invoices]);

  // Search invoices
  const searchInvoices = useCallback((query: string): Invoice[] => {
    if (!query.trim()) {
      return invoices;
    }

    const lowerQuery = query.toLowerCase();
    return invoices.filter(invoice => {
      // Search in invoice number
      if (invoice.invoiceNumber.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search in member name
      const member = memberService.getById(invoice.memberId);
      if (member) {
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        if (fullName.includes(lowerQuery)) {
          return true;
        }
      }

      return false;
    });
  }, [invoices]);

  const value: InvoiceContextType = {
    invoices,
    pendingInvoices,
    overdueInvoices,
    isLoading,
    error,
    refreshInvoices,
    getInvoiceById,
    getInvoicesByMember,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    generateInvoiceNumber,
    downloadPdf,
    previewPdf,
    filterByStatus,
    filterByDateRange,
    searchInvoices,
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
}

// Custom hook to use the invoice context
export function useInvoiceContext(): InvoiceContextType {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoiceContext must be used within an InvoiceProvider');
  }
  return context;
}
