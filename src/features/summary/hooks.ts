import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { budgetKeys } from '@/features/budgets/keys';
import { transactionKeys } from '@/features/transactions/keys';
import type { BudgetPeriod } from '@/types/database';
import { fetchSpendingSummary } from './api';
import { summaryKeys } from './keys';

export function useSpendingSummary(period: BudgetPeriod) {
  return useQuery({ queryKey: summaryKeys.period(period), queryFn: () => fetchSpendingSummary(period) });
}

/** "Tirar para actualizar" de Inicio: vuelve a pedir totales, presupuestos y últimos movimientos. */
export function useHomeRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.refetchQueries({ queryKey: summaryKeys.all }),
      queryClient.refetchQueries({ queryKey: budgetKeys.all }),
      queryClient.refetchQueries({ queryKey: transactionKeys.recent() }),
    ]).finally(() => setRefreshing(false));
  }, [queryClient]);
  return { refreshing, refresh };
}
