import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useActiveBudgets } from '@/features/budgets/hooks';
import { fetchCategorySpending } from '@/features/history/api';
import { breakdownRange } from '@/features/history/categories';
import { historyKeys } from '@/features/history/keys';
import { useTimeZone } from '@/features/profile/hooks';
import { fetchSpendingSummary } from '@/features/summary/api';
import { summaryKeys } from '@/features/summary/keys';
import { isSameDate, monthStart, toIsoDate, toLocalDate, type LocalDate } from '@/lib/dates';
import { nextMonth, previousMonth } from './month-nav';

/** Mes elegido, sus consultas y la navegación. `null` en el estado = el mes actual (sigue a la zona del perfil). */
export function useMonthData() {
  const timeZone = useTimeZone();
  const current = monthStart(toLocalDate(new Date(), timeZone));
  const [selected, setSelected] = useState<LocalDate | null>(null);
  const start = selected ?? current;
  const startIso = toIsoDate(start);
  const isCurrent = isSameDate(start, current);
  const next = nextMonth(start, current);
  const range = breakdownRange('month', startIso);

  const summary = useQuery({
    queryKey: summaryKeys.period('month', startIso),
    queryFn: () => fetchSpendingSummary('month', startIso),
    placeholderData: keepPreviousData,
  });
  const categories = useQuery({
    queryKey: historyKeys.categories(range, timeZone),
    queryFn: () => fetchCategorySpending(range),
    placeholderData: keepPreviousData,
  });
  const budgets = useActiveBudgets();

  const failed = [summary, categories, ...(isCurrent ? [budgets] : [])].filter((q) => q.isError);
  return {
    timeZone,
    start,
    isCurrent,
    canGoNext: next !== null,
    goPrevious: () => setSelected(previousMonth(start)),
    goNext: () => {
      if (next) setSelected(next);
    },
    summary,
    categories,
    monthlyLimit: budgets.data?.month ?? null,
    budgetsReady: budgets.isSuccess,
    failed: failed.length > 0,
    // Una consulta con error sigue en `error` mientras se vuelve a pedir; isFetching dice que está en curso.
    retrying: failed.some((q) => q.isFetching),
    retry: () => {
      failed.forEach((q) => void q.refetch());
    },
  };
}
