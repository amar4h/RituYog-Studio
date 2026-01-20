import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '../services';
import type { Invoice } from '../types';

const QUERY_KEY = 'invoices';

export function useInvoices() {
  const queryClient = useQueryClient();

  const invoicesQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => invoiceService.getAll(),
  });

  const pendingQuery = useQuery({
    queryKey: [QUERY_KEY, 'pending'],
    queryFn: () => invoiceService.getPending(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) =>
      Promise.resolve(invoiceService.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) =>
      Promise.resolve(invoiceService.update(id, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    invoices: invoicesQuery.data || [],
    pendingInvoices: pendingQuery.data || [],
    isLoading: invoicesQuery.isLoading,
    error: invoicesQuery.error,
    refetch: invoicesQuery.refetch,
    createInvoice: createMutation.mutate,
    updateInvoice: updateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    getByMember: (memberId: string) => invoiceService.getByMember(memberId),
    generateInvoiceNumber: () => invoiceService.generateInvoiceNumber(),
  };
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => invoiceService.getById(id),
    enabled: !!id,
  });
}
