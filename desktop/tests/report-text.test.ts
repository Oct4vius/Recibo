import { describe, expect, it } from 'vitest';
import { localDate } from '@/lib/dates';
import {
  emptyReportText,
  itemAmountLines,
  itemLabel,
  monthRowLabel,
  monthSheetTitle,
  monthTotalLabel,
  nextYear,
  pdfFileName,
  printedOnLine,
  shortDay,
  subtotalLabel,
  yearCountLine,
  yearLastMonth,
  yearRangeLine,
  yearSheetTitle,
} from '@desktop/reports/report-text';

const today = localDate(2026, 11, 4);

describe('report titles', () => {
  it('words the sheet titles', () => {
    expect(monthSheetTitle(localDate(2026, 10, 1))).toBe('Gastos de octubre 2026');
    expect(yearSheetTitle(2026)).toBe('Gastos de 2026');
  });
  it('words the printed-on line', () => {
    expect(printedOnLine(today)).toBe('Impreso el 4 de noviembre de 2026');
  });
  it('words the year range line', () => {
    expect(yearRangeLine(localDate(2026, 10, 1), today)).toBe(
      'De enero a octubre · impreso el 4 de noviembre de 2026',
    );
    expect(yearRangeLine(localDate(2025, 12, 1), today).startsWith('De enero a diciembre · ')).toBe(true);
  });
});

describe('shortDay', () => {
  it('abbreviates the month', () => {
    expect(shortDay(localDate(2026, 10, 1))).toBe('1 oct');
    expect(shortDay(localDate(2026, 10, 31))).toBe('31 oct');
  });
});

describe('totals and counts', () => {
  it('words subtotals and totals', () => {
    expect(subtotalLabel('Supermercado')).toBe('Subtotal Supermercado');
    expect(monthTotalLabel(23)).toBe('Total del mes (23 gastos)');
    expect(monthTotalLabel(1)).toBe('Total del mes (1 gasto)');
    expect(yearCountLine(214)).toBe('214 gastos en el año');
    expect(yearCountLine(1)).toBe('1 gasto en el año');
  });
});

describe('itemLabel', () => {
  it('trims the merchant or falls back', () => {
    expect(itemLabel('  Jumbo ')).toBe('Jumbo');
    expect(itemLabel('  ')).toBe('Sin descripción');
    expect(itemLabel(null)).toBe('Sin descripción');
  });
});

describe('itemAmountLines', () => {
  it('shows the approximation only for foreign currency', () => {
    expect(itemAmountLines({ amount: 12, currency: 'USD', amountDop: 720 })).toEqual({
      main: 'US$ 12.00',
      approx: '≈ RD$ 720.00',
    });
    expect(itemAmountLines({ amount: 500, currency: 'DOP', amountDop: 500 })).toEqual({
      main: 'RD$ 500.00',
      approx: null,
    });
  });
});

describe('empty text and file names', () => {
  it('words the empty sheet', () => {
    expect(emptyReportText('month', localDate(2026, 10, 1))).toBe('No hubo gastos en octubre.');
    expect(emptyReportText('year', localDate(2026, 1, 1))).toBe('No hubo gastos en 2026.');
  });
  it('names the PDF', () => {
    expect(pdfFileName('month', localDate(2026, 10, 1))).toBe('Recibo - Octubre 2026.pdf');
    expect(pdfFileName('year', localDate(2026, 1, 1))).toBe('Recibo - 2026.pdf');
  });
});

describe('year navigation', () => {
  it('finds the last month of a year', () => {
    expect(yearLastMonth(2025, today)).toEqual(localDate(2025, 12, 1));
    expect(yearLastMonth(2026, today)).toEqual(localDate(2026, 11, 1));
  });
  it('has no next year past the current one', () => {
    expect(nextYear(2025, 2026)).toBe(2026);
    expect(nextYear(2026, 2026)).toBeNull();
  });
  it('labels month rows', () => {
    expect(monthRowLabel(1)).toBe('Enero');
  });
});
