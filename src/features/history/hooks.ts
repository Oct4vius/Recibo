import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTimeZone } from '@/features/profile/hooks';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { fetchCategorySpending, type CategoryRange, fetchHistory, fetchSpendingOverall } from './api';
import type { Granularity } from './granularity';
import { historyKeys } from './keys';
import { historyWindow } from './window';

export function useHistory(granularity: Granularity, offset: number) {
  const timeZone = useTimeZone();
  const window = historyWindow(granularity, offset, toLocalDate(new Date(), timeZone));
  const query = useQuery({
    queryKey: historyKeys.window(granularity, toIsoDate(window.first), timeZone),
    // La granularidad viaja con los datos: mientras se muestran los anteriores, sus etiquetas y rangos siguen siendo coherentes.
    queryFn: async () => ({ granularity, buckets: await fetchHistory(granularity, window.first, window.last) }),
    // Al cambiar de ventana el gráfico sigue montado y las barras se ajustan a los datos nuevos; un cambio de granularidad lo remonta (HistoryScreen).
    placeholderData: keepPreviousData,
  });
  return { window, query };
}

/** Desglose por categoría del rango (`'all'` = todo el historial; `null` = sin período elegido: no consulta). Conserva el anterior mientras llega el nuevo. */
export function useCategorySpending(range: CategoryRange | null) {
  const timeZone = useTimeZone();
  return useQuery({
    // Con `null` la consulta está desactivada: la llave solo importa con rango.
    queryKey: historyKeys.categories(range ?? 'all', timeZone),
    queryFn: () => fetchCategorySpending(range ?? 'all'),
    enabled: range !== null,
    placeholderData: keepPreviousData,
  });
}

/** Total de todo el historial y fecha del primer gasto. */
export function useSpendingOverall() {
  const timeZone = useTimeZone();
  return useQuery({ queryKey: historyKeys.overall(timeZone), queryFn: fetchSpendingOverall });
}
