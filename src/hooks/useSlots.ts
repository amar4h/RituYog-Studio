import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slotService, slotSubscriptionService, trialBookingService } from '../services';

const QUERY_KEY = 'slots';
const SLOT_SUBSCRIPTIONS_KEY = 'slotSubscriptions';

export function useSlots() {
  const queryClient = useQueryClient();

  const slotsQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => slotService.getActive(),
  });

  const updateCapacityMutation = useMutation({
    mutationFn: ({
      slotId,
      capacity,
      exceptionCapacity,
    }: {
      slotId: string;
      capacity: number;
      exceptionCapacity: number;
    }) => Promise.resolve(slotService.updateCapacity(slotId, capacity, exceptionCapacity)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    slots: slotsQuery.data || [],
    isLoading: slotsQuery.isLoading,
    error: slotsQuery.error,
    refetch: slotsQuery.refetch,
    updateCapacity: updateCapacityMutation.mutate,
    isUpdating: updateCapacityMutation.isPending,
    getAvailability: (slotId: string, date: string) => slotService.getSlotAvailability(slotId, date),
    hasCapacity: (slotId: string, date: string, isException?: boolean) =>
      slotService.hasCapacity(slotId, date, isException),
  };
}

export function useSlotSubscriptions(slotId?: string) {
  const queryClient = useQueryClient();

  const subscriptionsQuery = useQuery({
    queryKey: [SLOT_SUBSCRIPTIONS_KEY, slotId],
    queryFn: () => {
      if (slotId) {
        return slotSubscriptionService.getActiveForSlot(slotId);
      }
      return slotSubscriptionService.getAll();
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: (data: { memberId: string; slotId: string; isException?: boolean; notes?: string }) =>
      Promise.resolve(
        slotSubscriptionService.subscribe(data.memberId, data.slotId, data.isException, data.notes)
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SLOT_SUBSCRIPTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const changeSlotMutation = useMutation({
    mutationFn: ({
      memberId,
      newSlotId,
      isException,
    }: {
      memberId: string;
      newSlotId: string;
      isException?: boolean;
    }) => Promise.resolve(slotSubscriptionService.changeSlot(memberId, newSlotId, isException)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SLOT_SUBSCRIPTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (memberId: string) => Promise.resolve(slotSubscriptionService.deactivate(memberId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SLOT_SUBSCRIPTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    subscriptions: subscriptionsQuery.data || [],
    isLoading: subscriptionsQuery.isLoading,
    error: subscriptionsQuery.error,
    refetch: subscriptionsQuery.refetch,
    subscribe: subscribeMutation.mutate,
    changeSlot: changeSlotMutation.mutate,
    deactivate: deactivateMutation.mutate,
    isSubscribing: subscribeMutation.isPending,
    isChanging: changeSlotMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
    getMemberSubscription: (memberId: string) => slotSubscriptionService.getByMember(memberId),
  };
}

export function useTrialBookings(slotId?: string, date?: string) {
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ['trialBookings', slotId, date],
    queryFn: () => {
      if (slotId && date) {
        return trialBookingService.getBySlotAndDate(slotId, date);
      }
      return trialBookingService.getAll();
    },
  });

  const bookTrialMutation = useMutation({
    mutationFn: (data: { leadId: string; slotId: string; date: string; isException?: boolean }) =>
      Promise.resolve(trialBookingService.bookTrial(data.leadId, data.slotId, data.date, data.isException)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trialBookings'] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  return {
    bookings: bookingsQuery.data || [],
    isLoading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    refetch: bookingsQuery.refetch,
    bookTrial: bookTrialMutation.mutate,
    isBooking: bookTrialMutation.isPending,
  };
}
