import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserId } from '@/features/auth/hooks';
import type { BudgetPeriod } from '@/types/database';
import { fetchActiveBudgets, removeBudget, saveBudget } from './api';
import { budgetKeys } from './keys';

export function useActiveBudgets() {
  return useQuery({ queryKey: budgetKeys.active(), queryFn: fetchActiveBudgets });
}

export function useSaveBudget() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({ period, limitCents }: { period: BudgetPeriod; limitCents: number }) => saveBudget(userId, period, limitCents),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all }),
  });
}

export function useRemoveBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (period: BudgetPeriod) => removeBudget(period),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all }),
  });
}
