import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTimeZone } from '@/features/profile/hooks';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { fetchCategorySpending, fetchHistory, fetchSpendingOverall } from './api';
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
    // Al cambiar de ventana o granularidad el gráfico sigue montado y las barras se ajustan a los datos nuevos.
    placeholderData: keepPreviousData,
  });
  return { window, query };
}

/** Desglose por categoría del rango (`null` = todo el historial). Conserva el anterior mientras llega el nuevo. */
export function useCategorySpending(range: { from: string; to: string } | null) {
  const timeZone = useTimeZone();
  return useQuery({
    queryKey: historyKeys.categories(range?.from ?? null, range?.to ?? null, timeZone),
    queryFn: () => fetchCategorySpending(range),
    placeholderData: keepPreviousData,
  });
}

/** Total de todo el historial y fecha del primer gasto. */
export function useSpendingOverall() {
  const timeZone = useTimeZone();
  return useQuery({ queryKey: historyKeys.overall(timeZone), queryFn: fetchSpendingOverall });
}
