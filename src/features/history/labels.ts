import { addDays, monthAbbreviation, monthName, type LocalDate } from '@/lib/dates';
import { moneyAccessibilityLabel } from '@/lib/money';
import type { Granularity } from './granularity';

const counter = new Intl.NumberFormat('en-US');

export const GRANULARITY_LABELS: Record<Granularity, string> = { week: 'Semana', month: 'Mes', year: 'Año' };

const day2 = (date: LocalDate) => String(date.day).padStart(2, '0');

/** `05 OCT – 11 OCT`, `OCTUBRE 2026` o `2026`. */
export function bucketLabel(granularity: Granularity, start: LocalDate): string {
  if (granularity === 'week') {
    const end = addDays(start, 6);
    return `${day2(start)} ${monthAbbreviation(start.month)} – ${day2(end)} ${monthAbbreviation(end.month)}`;
  }
  if (granularity === 'month') return `${monthName(start.month).toUpperCase()} ${start.year}`;
  return String(start.year);
}

export interface AxisLabel {
  top: string;
  /** Contexto (mes o año) solo en la primera barra y cuando cambia. */
  bottom: string;
}

export function axisLabels(granularity: Granularity, starts: readonly LocalDate[]): AxisLabel[] {
  return starts.map((start, i) => {
    const previous = i > 0 ? starts[i - 1] : null;
    if (granularity === 'week') {
      return { top: day2(start), bottom: !previous || previous.month !== start.month ? monthAbbreviation(start.month) : '' };
    }
    if (granularity === 'month') {
      return { top: monthAbbreviation(start.month), bottom: !previous || previous.year !== start.year ? String(start.year) : '' };
    }
    return { top: String(start.year), bottom: '' };
  });
}

/** `Semana del 5 de octubre: 4,275.72 pesos`. */
export function bucketAccessibilityLabel(granularity: Granularity, start: LocalDate, totalDop: number): string {
  const amount = moneyAccessibilityLabel(totalDop, 'DOP');
  if (granularity === 'week') return `Semana del ${start.day} de ${monthName(start.month)}: ${amount}`;
  if (granularity === 'month') {
    const name = monthName(start.month);
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${start.year}: ${amount}`;
  }
  return `${start.year}: ${amount}`;
}

/** "3 gastos" / "1 gasto": `get_history` cuenta solo lo que suma al gasto (no los movimientos ignorados). */
export function expenseCountLabel(count: number): string {
  return `${counter.format(count)} ${count === 1 ? 'gasto' : 'gastos'}`;
}
