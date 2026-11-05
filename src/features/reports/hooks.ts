import { useQuery } from '@tanstack/react-query';
import { useTimeZone } from '@/features/profile/hooks';
import { toIsoDate, type LocalDate } from '@/lib/dates';
import { fetchMonthReport, fetchYearReport } from './api';
import { reportKeys } from './keys';

/** `null` = sin mes elegido: no consulta. Sin `keepPreviousData`: nunca la hoja de otro período bajo el título nuevo. */
export function useMonthReport(start: LocalDate | null) {
  const timeZone = useTimeZone();
  return useQuery({
    queryKey: reportKeys.month(start ? toIsoDate(start) : '', timeZone),
    queryFn: () => fetchMonthReport(start as LocalDate),
    enabled: start !== null,
  });
}

/** `null` = sin año elegido: no consulta. */
export function useYearReport(year: number | null, lastMonth: LocalDate) {
  const timeZone = useTimeZone();
  return useQuery({
    queryKey: reportKeys.year(year ?? 0, toIsoDate(lastMonth), timeZone),
    queryFn: () => fetchYearReport(year as number, lastMonth),
    enabled: year !== null,
  });
}
