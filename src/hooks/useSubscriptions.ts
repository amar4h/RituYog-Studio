import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '../services';
import type { MembershipSubscription } from '../types';

const QUERY_KEY = 'subscriptions';

export function useSubscriptions() {
  const queryClient = useQueryClient();

  const subscriptionsQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => subscriptionService.getAll(),
  });

  const expiringSoonQuery = useQuery({
    queryKey: [QUERY_KEY, 'expiring'],
    queryFn: () => subscriptionService.getExpiringSoon(7),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      memberId: string;
      planId: string;
      slotId: string;
      startDate: string;
      discountAmount?: number;
      discountReason?: string;
      notes?: string;
    }) =>
      Promise.resolve(
        subscriptionService.createWithInvoice(
          data.memberId,
          data.planId,
          data.slotId,
          data.startDate,
          data.discountAmount || 0,
          data.discountReason,
          data.notes
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const extendMutation = useMutation({
    mutationFn: ({
      subscriptionId,
      extensionDays,
      reason,
    }: {
      subscriptionId: string;
      extensionDays: number;
      reason?: string;
    }) => Promise.resolve(subscriptionService.extendSubscription(subscriptionId, extensionDays, reason)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MembershipSubscription> }) =>
      Promise.resolve(subscriptionService.update(id, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    subscriptions: subscriptionsQuery.data || [],
    expiringSoon: expiringSoonQuery.data || [],
    isLoading: subscriptionsQuery.isLoading,
    error: subscriptionsQuery.error,
    refetch: subscriptionsQuery.refetch,
    createSubscription: createMutation.mutate,
    extendSubscription: extendMutation.mutate,
    updateSubscription: updateMutation.mutate,
    isCreating: createMutation.isPending,
    isExtending: extendMutation.isPending,
    isUpdating: updateMutation.isPending,
    getByMember: (memberId: string) => subscriptionService.getByMember(memberId),
  };
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => subscriptionService.getById(id),
    enabled: !!id,
  });
}

export function useMemberSubscription(memberId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'member', memberId],
    queryFn: () => subscriptionService.getActiveMemberSubscription(memberId),
    enabled: !!memberId,
  });
}
