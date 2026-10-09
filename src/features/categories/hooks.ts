import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useUserId } from '@/features/auth/hooks';
import { invalidateSpending } from '@/features/transactions/invalidate';
import { countCategoryRules, deleteCategory, fetchCategories, fetchRecentCategoryIds, saveCategory, type CategoryInput } from './api';
import { categoryKeys } from './keys';
import { pickRecentCategories, type CategoryOption } from './recent';

export function useCategories() {
  return useQuery({ queryKey: categoryKeys.list(), queryFn: fetchCategories, staleTime: 5 * 60_000 });
}

/** Las 3 categorías usadas más recientemente (completa con las primeras por nombre). */
export function useRecentCategories(): CategoryOption[] {
  const categories = useCategories();
  const recentIds = useQuery({ queryKey: categoryKeys.recent(), queryFn: fetchRecentCategoryIds });
  return useMemo(
    () => pickRecentCategories(recentIds.data ?? [], categories.data ?? []),
    [recentIds.data, categories.data],
  );
}

export function useCategoryRuleCount(categoryId: string | null) {
  return useQuery({
    queryKey: categoryKeys.ruleCount(categoryId ?? ''),
    queryFn: () => countCategoryRules(categoryId ?? ''),
    enabled: categoryId !== null,
  });
}

/** Renombrar o cambiar "Cuenta como gasto" cambia totales e historial: se invalida también lo de gastos. */
export function useSaveCategory() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: CategoryInput) => saveCategory(input, userId),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: categoryKeys.all }), invalidateSpending(queryClient)]),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: categoryKeys.all }), invalidateSpending(queryClient)]),
  });
}
