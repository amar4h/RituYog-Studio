import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadService } from '../services';
import type { Lead, LeadFilters } from '../types';

const QUERY_KEY = 'leads';

export function useLeads(filters?: LeadFilters) {
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => {
      let leads = leadService.getAll();

      if (filters) {
        if (filters.search) {
          leads = leadService.search(filters.search);
        }
        if (filters.status) {
          leads = leads.filter(l => l.status === filters.status);
        }
        if (filters.source) {
          leads = leads.filter(l => l.source === filters.source);
        }
        if (filters.dateFrom) {
          leads = leads.filter(l => l.createdAt >= filters.dateFrom!);
        }
        if (filters.dateTo) {
          leads = leads.filter(l => l.createdAt <= filters.dateTo!);
        }
      }

      return leads;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) =>
      Promise.resolve(leadService.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      Promise.resolve(leadService.update(id, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (leadId: string) => Promise.resolve(leadService.convertToMember(leadId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => Promise.resolve(leadService.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    leads: leadsQuery.data || [],
    isLoading: leadsQuery.isLoading,
    error: leadsQuery.error,
    refetch: leadsQuery.refetch,
    createLead: createMutation.mutate,
    updateLead: updateMutation.mutate,
    convertToMember: convertMutation.mutate,
    deleteLead: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isConverting: convertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useLead(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => leadService.getById(id),
    enabled: !!id,
  });
}
