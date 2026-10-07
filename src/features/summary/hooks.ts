import { useQuery } from '@tanstack/react-query';
import type { BudgetPeriod } from '@/types/database';
import { fetchSpendingSummary } from './api';
import { summaryKeys } from './keys';

export function useSpendingSummary(period: BudgetPeriod) {
  return useQuery({ queryKey: summaryKeys.period(period), queryFn: () => fetchSpendingSummary(period) });
}
