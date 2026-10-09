import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryKeys } from '@/features/categories/keys';
import { invalidateSpending } from '@/features/transactions/invalidate';
import { deleteRule, fetchRules, saveRule, type RuleInput } from './api';
import { rulesKeys } from './keys';

export function useRules() {
  return useQuery({ queryKey: rulesKeys.list(), queryFn: fetchRules });
}

/** Una regla guardada puede categorizar movimientos: cambia lista, totales e historial. */
export function useSaveRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RuleInput) => saveRule(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: rulesKeys.all }),
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        invalidateSpending(queryClient),
      ]),
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: rulesKeys.all }),
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
      ]),
  });
}
