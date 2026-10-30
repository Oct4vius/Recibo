import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserId } from '@/features/auth/hooks';
import { updateProfile } from '@/features/profile/api';
import { profileKeys } from '@/features/profile/keys';
import { silenceBudgetAlerts } from './api';
import { saveAlertThresholds } from './flows';

export function useUpdateAlertThresholds() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({ thresholds, turnedOn }: { thresholds: number[]; turnedOn: boolean }) =>
      saveAlertThresholds(
        { silence: silenceBudgetAlerts, save: (t) => updateProfile(userId, { alert_thresholds: t }) },
        thresholds,
        turnedOn,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.all }),
  });
}
