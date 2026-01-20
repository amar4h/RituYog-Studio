import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipPlanService } from '../services';
import type { MembershipPlan } from '../types';

const QUERY_KEY = 'plans';

export function usePlans() {
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => membershipPlanService.getAll(),
  });

  const activePlansQuery = useQuery({
    queryKey: [QUERY_KEY, 'active'],
    queryFn: () => membershipPlanService.getActive(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<MembershipPlan, 'id' | 'createdAt' | 'updatedAt'>) =>
      Promise.resolve(membershipPlanService.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MembershipPlan> }) =>
      Promise.resolve(membershipPlanService.update(id, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => Promise.resolve(membershipPlanService.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    plans: plansQuery.data || [],
    activePlans: activePlansQuery.data || [],
    isLoading: plansQuery.isLoading,
    error: plansQuery.error,
    refetch: plansQuery.refetch,
    createPlan: createMutation.mutate,
    updatePlan: updateMutation.mutate,
    deletePlan: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    getById: (id: string) => membershipPlanService.getById(id),
  };
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => membershipPlanService.getById(id),
    enabled: !!id,
  });
}
