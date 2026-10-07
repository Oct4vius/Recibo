import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { categoryKeys } from '@/features/categories/keys';
import { useUserId } from '@/features/auth/hooks';
import { useTimeZone } from '@/features/profile/hooks';
import { summaryKeys } from '@/features/summary/keys';
import {
  createExpense,
  deleteExpense,
  fetchRecentTransactions,
  fetchTransactionPage,
  PAGE_SIZE,
  setIgnored,
  updateExpense,
  type ExpenseChanges,
  type NewExpense,
} from './api';
import type { TransactionFilters } from './filters';
import { transactionKeys } from './keys';
import type { TransactionListItem } from './mapping';

const RECENT_COUNT = 5;

/** Todo lo que depende de los movimientos: lista, totales y categorías recientes. */
function invalidateSpending(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
    queryClient.invalidateQueries({ queryKey: summaryKeys.all }),
    queryClient.invalidateQueries({ queryKey: categoryKeys.recent() }),
  ]);
}

export function useTransactionList(filters: TransactionFilters) {
  const timeZone = useTimeZone();
  return useInfiniteQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: ({ pageParam }) => fetchTransactionPage(filters, pageParam, new Date(), timeZone),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (pages.length * PAGE_SIZE < last.count ? pages.length : undefined),
  });
}

export function useRecentTransactions() {
  return useQuery({ queryKey: transactionKeys.recent(), queryFn: () => fetchRecentTransactions(RECENT_COUNT) });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (expense: NewExpense) => createExpense(expense, userId),
    onSuccess: () => invalidateSpending(queryClient),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: ExpenseChanges }) => updateExpense(id, changes),
    onSuccess: () => invalidateSpending(queryClient),
  });
}

export function useSetIgnored() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ignored }: { id: string; ignored: boolean }) => setIgnored(id, ignored),
    onSuccess: () => invalidateSpending(queryClient),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => invalidateSpending(queryClient),
  });
}

/** Estado del panel de gasto compartido por Inicio y Movimientos: cerrado, gasto nuevo o edición de `item`. */
export function useExpenseSheet() {
  const [state, setState] = useState<{ item: TransactionListItem | null } | null>(null);
  const openNew = useCallback(() => setState({ item: null }), []);
  const openEdit = useCallback((item: TransactionListItem) => setState({ item }), []);
  const close = useCallback(() => setState(null), []);
  return { openNew, openEdit, sheet: { visible: state !== null, item: state?.item ?? null, onClose: close } };
}
