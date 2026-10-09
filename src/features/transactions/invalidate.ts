import type { QueryClient } from '@tanstack/react-query';
import { categoryKeys } from '@/features/categories/keys';
import { historyKeys } from '@/features/history/keys';
import { summaryKeys } from '@/features/summary/keys';
import { transactionKeys } from './keys';

/** Todo lo que depende de los movimientos o de cómo cuentan: lista, totales, historial y categorías recientes. */
export function invalidateSpending(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
    queryClient.invalidateQueries({ queryKey: summaryKeys.all }),
    queryClient.invalidateQueries({ queryKey: historyKeys.all }),
    queryClient.invalidateQueries({ queryKey: categoryKeys.recent() }),
  ]);
}
