import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberService } from '../services';
import type { Member, MemberFilters } from '../types';

const QUERY_KEY = 'members';

export function useMembers(filters?: MemberFilters) {
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => {
      let members = memberService.getAll();

      if (filters) {
        if (filters.search) {
          members = memberService.search(filters.search);
        }
        if (filters.status) {
          members = members.filter(m => m.status === filters.status);
        }
        if (filters.slotId) {
          members = members.filter(m => m.assignedSlotId === filters.slotId);
        }
      }

      return members;
    },
  });

  const memberQuery = (id: string) => useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => memberService.getById(id),
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) =>
      Promise.resolve(memberService.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Member> }) =>
      Promise.resolve(memberService.update(id, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => Promise.resolve(memberService.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    members: membersQuery.data || [],
    isLoading: membersQuery.isLoading,
    error: membersQuery.error,
    refetch: membersQuery.refetch,
    getMember: memberQuery,
    createMember: createMutation.mutate,
    updateMember: updateMutation.mutate,
    deleteMember: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useMember(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => memberService.getById(id),
    enabled: !!id,
  });
}
