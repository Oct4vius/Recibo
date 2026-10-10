import { addDays, minutesOfDay, toLocalDate, zonedInstant, type LocalDate } from '@/lib/dates';

export type DateChoice = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'other'; date: LocalDate };

/** Momento a guardar para un gasto manual: el día elegido a la hora local actual, en la zona del perfil. */
export function occurredAtFor(choice: DateChoice, now: Date, timeZone: string): string {
  if (choice.kind === 'today') return now.toISOString();
  const date = choice.kind === 'yesterday' ? addDays(toLocalDate(now, timeZone), -1) : choice.date;
  return zonedInstant(date, minutesOfDay(now, timeZone), timeZone).toISOString();
}
