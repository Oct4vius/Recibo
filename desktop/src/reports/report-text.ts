import { localDate, monthName, type LocalDate } from '@/lib/dates';
import { expenseCountLabel } from '@/features/history/labels';
import type { ReportItem } from '@/features/reports/types';
import { formatApprox, formatMoney } from '@/lib/money';
import { capitalize, monthTitle } from '@desktop/month/month-text';

export type ReportKind = 'month' | 'year';

const NO_DESCRIPTION = 'Sin descripción';

/** `1 oct`, `31 oct`. */
export function shortDay(date: LocalDate): string {
  return `${date.day} ${monthName(date.month).slice(0, 3)}`;
}

/** `impreso el 4 de noviembre de 2026`. */
function printedOn(today: LocalDate): string {
  return `impreso el ${today.day} de ${monthName(today.month)} de ${today.year}`;
}

/** `Impreso el 4 de noviembre de 2026`. */
export function printedOnLine(today: LocalDate): string {
  return capitalize(printedOn(today));
}

/** `Gastos de octubre 2026`. */
export function monthSheetTitle(start: LocalDate): string {
  return `Gastos de ${monthName(start.month)} ${start.year}`;
}

/** `Gastos de 2026`. */
export function yearSheetTitle(year: number): string {
  return `Gastos de ${year}`;
}

/** `De enero a octubre · impreso el 4 de noviembre de 2026`. */
export function yearRangeLine(lastMonth: LocalDate, today: LocalDate): string {
  const span = lastMonth.month === 1 ? 'Enero' : `De enero a ${monthName(lastMonth.month)}`;
  return `${span} · ${printedOn(today)}`;
}

/** `Subtotal Supermercado`. */
export function subtotalLabel(name: string): string {
  return `Subtotal ${name}`;
}

/** `Total del mes (23 gastos)`. */
export function monthTotalLabel(count: number): string {
  return `Total del mes (${expenseCountLabel(count)})`;
}

/** `214 gastos en el año`. */
export function yearCountLine(count: number): string {
  return `${expenseCountLabel(count)} en el año`;
}

/** Comercio recortado; vacío o nulo → `Sin descripción`. */
export function itemLabel(merchant: string | null): string {
  const trimmed = merchant?.trim();
  return trimmed ? trimmed : NO_DESCRIPTION;
}

/** Monto en su moneda y, si no es DOP, el equivalente `≈ RD$ …` (la app nunca multiplica). */
export function itemAmountLines(item: Pick<ReportItem, 'amount' | 'currency' | 'amountDop'>): {
  main: string;
  approx: string | null;
} {
  return {
    main: formatMoney(item.amount, item.currency),
    approx: item.currency === 'DOP' ? null : formatApprox(item.amountDop, 'DOP'),
  };
}

/** Hoja sin gastos. */
export function emptyReportText(kind: ReportKind, start: LocalDate): string {
  return kind === 'month' ? `No hubo gastos en ${monthName(start.month)}.` : `No hubo gastos en ${start.year}.`;
}

/** Nombre sugerido del PDF. */
export function pdfFileName(kind: ReportKind, start: LocalDate): string {
  return `Recibo - ${kind === 'month' ? monthTitle(start) : start.year}.pdf`;
}

/** Último mes con datos posibles del año: el mes de hoy en el año actual, diciembre en uno pasado. */
export function yearLastMonth(year: number, today: LocalDate): LocalDate {
  return year === today.year ? localDate(year, today.month, 1) : localDate(year, 12, 1);
}

/** Año siguiente, o null si ya es el actual. */
export function nextYear(year: number, currentYear: number): number | null {
  return year < currentYear ? year + 1 : null;
}

/** `Enero` (fila de "Por mes"). */
export function monthRowLabel(month: number): string {
  return capitalize(monthName(month));
}
