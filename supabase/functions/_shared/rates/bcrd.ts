import { toUsdRates } from './normalize.ts';
import { type RateSource, RateSourceError, type RawRateRow, type UsdRate } from './types.ts';
import { readSheetRows, type SheetRow } from './xlsx.ts';

export const BCRD_SOURCE_ID = 'bcrd';
export const BCRD_RATES_URL =
  'https://cdn.bancentral.gov.do/documents/estadisticas/mercado-cambiario/documents/TASA_DOLAR_REFERENCIA_MC.xlsx';
const DAILY_SHEET = 'Diaria';
const FETCH_TIMEOUT_MS = 30_000;
// Etiquetas de mes sin ambigüedad (español del archivo actual e inglés por si cambia el idioma).
const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8,
  sep: 9, sept: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

/** `Ene `, `Jan`, `Sept` → 1..12; null si la etiqueta no es un mes conocido. */
export function monthNumber(label: string | number | undefined): number | null {
  return MONTHS[normalizeLabel(label)] ?? null;
}

function normalizeLabel(value: string | number | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

interface Columns {
  year: string;
  month: string;
  day: string;
  sell: string;
}

/** Busca el encabezado `Año | Mes | Día | Compra | Venta`: si cambia, el formato no se reconoce. */
function findHeader(rows: SheetRow[]): { index: number; columns: Columns } {
  for (let index = 0; index < rows.length; index++) {
    const byLabel = new Map([...rows[index]].map(([column, value]) => [normalizeLabel(value), column]));
    const [year, month, day, buy, sell] = ['ano', 'mes', 'dia', 'compra', 'venta'].map((label) => byLabel.get(label));
    if (year && month && day && buy && sell) return { index, columns: { year, month, day, sell } };
  }
  throw new RateSourceError('the daily sheet has no recognizable header');
}

function integer(value: string | number | undefined): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

/** Filas de la hoja `Diaria` con la columna **Venta**. Salta las filas sin año (títulos, notas). */
export function extractBcrdRows(body: Uint8Array): RawRateRow[] {
  const rows = readSheetRows(body, DAILY_SHEET);
  const { index, columns } = findHeader(rows);
  const result: RawRateRow[] = [];
  for (const row of rows.slice(index + 1)) {
    const yearCell = row.get(columns.year);
    if (yearCell === undefined) continue;
    const year = integer(yearCell);
    const month = monthNumber(row.get(columns.month));
    const day = integer(row.get(columns.day));
    const sell = row.get(columns.sell);
    if (year === null || month === null || day === null || sell === undefined) throw new RateSourceError('a daily row is unreadable');
    const mm = String(month).padStart(2, '0');
    result.push({ date: `${year}-${mm}-${String(day).padStart(2, '0')}`, sell });
  }
  return result;
}

/**
 * Con `range`, solo se validan las filas de esa ventana: el archivo trae todo el histórico desde 1991 y una fila vieja
 * rara (p. ej. 58.46532 del 2020-09-29, con 5 decimales) no debe tumbar la carga de hoy para siempre. Dentro de la
 * ventana sigue siendo todo o nada. Un archivo sin ninguna fila de datos siempre falla.
 */
export function parseBcrdRates(body: Uint8Array, range?: { from: string; to: string }): UsdRate[] {
  const rows = extractBcrdRows(body);
  if (rows.length === 0) return toUsdRates(rows);
  const inRange = range ? rows.filter((row) => row.date >= range.from && row.date <= range.to) : rows;
  return inRange.length === 0 ? [] : toUsdRates(inRange);
}

/** El archivo trae todo el histórico y no acepta rango: se descarga completo y se lee solo la ventana pedida. */
export function createBcrdSource(fetchFn: typeof fetch): RateSource {
  return {
    id: BCRD_SOURCE_ID,
    async fetchRates(from, to) {
      let response: Response;
      try {
        response = await fetchFn(BCRD_RATES_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      } catch {
        throw new RateSourceError('the BCRD file could not be requested');
      }
      if (!response.ok) throw new RateSourceError(`the BCRD file answered HTTP ${response.status}`);
      return parseBcrdRates(new Uint8Array(await response.arrayBuffer()), { from, to });
    },
  };
}
