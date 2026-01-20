import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services';
import type { Payment, PaymentMethod } from '../types';

const QUERY_KEY = 'payments';

export function usePayments() {
  const queryClient = useQueryClient();

  const paymentsQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => paymentService.getAll(),
  });

  const recordMutation = useMutation({
    mutationFn: (data: {
      invoiceId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      paymentDate?: string;
      transactionReference?: string;
      notes?: string;
    }) =>
      Promise.resolve(
        paymentService.recordPayment(
          data.invoiceId,
          data.amount,
          data.paymentMethod,
          data.paymentDate,
          data.transactionReference,
          data.notes
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Payment> }) =>
      Promise.resolve(paymentService.update(id, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    payments: paymentsQuery.data || [],
    isLoading: paymentsQuery.isLoading,
    error: paymentsQuery.error,
    refetch: paymentsQuery.refetch,
    recordPayment: recordMutation.mutate,
    updatePayment: updateMutation.mutate,
    isRecording: recordMutation.isPending,
    isUpdating: updateMutation.isPending,
    getByMember: (memberId: string) => paymentService.getByMember(memberId),
    getByInvoice: (invoiceId: string) => paymentService.getByInvoice(invoiceId),
    getRevenue: (startDate: string, endDate: string) => paymentService.getRevenue(startDate, endDate),
  };
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => paymentService.getById(id),
    enabled: !!id,
  });
}
