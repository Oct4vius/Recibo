import { type RawRateRow, RateSourceError, type UsdRate } from './types.ts';

const RATE_TEXT = /^\d{1,3}([.,]\d{1,4})?$/;

/** `numeric(10,4)` guarda hasta 4 decimales; 0 < tasa < 1000. Todo lo demás es null: no se adivina. */
export function parseRate(raw: string | number): number | null {
  let value: number;
  if (typeof raw === 'number') {
    value = Math.round(raw * 10_000) / 10_000;
  } else {
    const text = raw.trim();
    if (!RATE_TEXT.test(text)) return null;
    value = Number(text.replace(',', '.'));
  }
  return Number.isFinite(value) && value > 0 && value < 1000 ? value : null;
}

function isRealDate(isoDate: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Valida y ordena. Lanza si algo es dudoso: una falla de la fuente no debe guardar un número incierto. */
export function toUsdRates(rows: readonly RawRateRow[]): UsdRate[] {
  if (rows.length === 0) throw new RateSourceError('the source has no rate rows');
  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (!isRealDate(row.date)) throw new RateSourceError('the source has an invalid date');
    const sell = parseRate(row.sell);
    if (sell === null) throw new RateSourceError('the source has an unreadable rate');
    const known = byDate.get(row.date);
    if (known !== undefined && known !== sell) throw new RateSourceError('the source has two different rates for one date');
    byDate.set(row.date, sell);
  }
  return [...byDate.entries()].map(([date, sell]) => ({ date, sell })).sort((a, b) => (a.date < b.date ? -1 : 1));
}
