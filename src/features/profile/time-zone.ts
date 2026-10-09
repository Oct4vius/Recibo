import { utcOffsetMinutes } from '@/lib/dates';

/** `America/Santo_Domingo` → `Santo Domingo`. */
export function timeZoneCity(timeZone: string): string {
  return (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
}

/** `-240` → `UTC−4`; `330` → `UTC+5:30`; `0` → `UTC+0`. Usa el signo menos tipográfico. */
export function formatUtcOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const rest = abs % 60;
  return `UTC${sign}${Math.floor(abs / 60)}${rest ? `:${String(rest).padStart(2, '0')}` : ''}`;
}

/** `Santo Domingo (UTC−4)`. */
export function timeZoneLabel(timeZone: string, now: Date): string {
  return `${timeZoneCity(timeZone)} (${formatUtcOffset(utcOffsetMinutes(now, timeZone))})`;
}
