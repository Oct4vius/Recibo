import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTimeZone } from '@/features/profile/hooks';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { fetchHistory } from './api';
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
