import { useQuery } from '@tanstack/react-query';
import { fetchActiveBudgets } from './api';
import { budgetKeys } from './keys';

export function useActiveBudgets() {
  return useQuery({ queryKey: budgetKeys.active(), queryFn: fetchActiveBudgets });
}
