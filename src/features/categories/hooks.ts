import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchCategories, fetchRecentCategoryIds } from './api';
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
