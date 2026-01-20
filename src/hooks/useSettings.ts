import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService, authService } from '../services';
import type { StudioSettings } from '../types';

const QUERY_KEY = 'settings';

export function useSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => settingsService.getOrDefault(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<StudioSettings>) => Promise.resolve(settingsService.updatePartial(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      // Verify current password first
      const settings = settingsService.getOrDefault();
      const adminPassword = settings.adminPassword || 'admin123';

      if (currentPassword !== adminPassword) {
        throw new Error('Current password is incorrect');
      }

      authService.changePassword(newPassword);
      return Promise.resolve(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    refetch: settingsQuery.refetch,
    updateSettings: updateMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    isUpdating: updateMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    passwordError: changePasswordMutation.error,
  };
}
