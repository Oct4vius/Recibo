import { toUsdRates } from './normalize.ts';
import { type RateSource, RateSourceError, type RawRateRow, type UsdRate } from './types.ts';
import { readSheetRows, type SheetRow } from './xlsx.ts';

export const BCRD_SOURCE_ID = 'bcrd';
export const BCRD_RATES_URL =
  'https://cdn.bancentral.gov.do/documents/estadisticas/mercado-cambiario/documents/TASA_DOLAR_REFERENCIA_MC.xlsx';
const DAILY_SHEET = 'Diaria';
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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
    const month = MONTHS.indexOf(normalizeLabel(row.get(columns.month)));
    const day = integer(row.get(columns.day));
    const sell = row.get(columns.sell);
    if (year === null || month < 0 || day === null || sell === undefined) throw new RateSourceError('a daily row is unreadable');
    const mm = String(month + 1).padStart(2, '0');
    result.push({ date: `${year}-${mm}-${String(day).padStart(2, '0')}`, sell });
  }
  return result;
}

export function parseBcrdRates(body: Uint8Array): UsdRate[] {
  return toUsdRates(extractBcrdRows(body));
}

/** El archivo trae todo el histórico y no acepta rango: devuelve todo y quien llama filtra su ventana. */
export function createBcrdSource(fetchFn: typeof fetch): RateSource {
  return {
    id: BCRD_SOURCE_ID,
    async fetchRates() {
      let response: Response;
      try {
        response = await fetchFn(BCRD_RATES_URL);
      } catch {
        throw new RateSourceError('the BCRD file could not be requested');
      }
      if (!response.ok) throw new RateSourceError(`the BCRD file answered HTTP ${response.status}`);
      return parseBcrdRates(new Uint8Array(await response.arrayBuffer()));
    },
  };
}
