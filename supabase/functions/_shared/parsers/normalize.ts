import type { Currency } from './types.ts';

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: '\u00a0', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü',
  iexcl: '¡', iquest: '¿',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const isHex = code[1] === 'x' || code[1] === 'X';
      const n = isHex ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code] ?? match;
  });
}

/** Separador temporal de filas; \s no lo matchea, así que sobrevive al colapso de espacios. */
const ROW_BREAK = '\u0000';
const BLOCK_END = /<br\b[^>]*>|<\/(?:tr|p|div|li|h[1-6]|table|thead|tbody|ul|ol)\s*>/gi;

/**
 * HTML del banco → texto estable para los parsers.
 * - Una línea por fila de tabla o bloque (tr, p, div, br, ...).
 * - Celdas (td/th) separadas por " | ". Celdas vacías intermedias se conservan;
 *   las celdas vacías AL FINAL de la fila se descartan (todos los pipes finales se quitan).
 * - Sin líneas vacías, sin espacios dobles.
 * - Una línea que empieza con "|" se fusiona con la fila anterior (bloques dentro de una celda).
 */
export function htmlToText(html: string): string {
  const withMarkers = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/t[dh]\s*>/gi, ' | ')
    .replace(BLOCK_END, ROW_BREAK)
    .replace(/<[^>]+>/g, ' ');

  const decoded = decodeEntities(withMarkers).replace(/[\s\u00a0]+/g, ' ');

  const lines = decoded
    .split(ROW_BREAK)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Una línea que empieza con "|" es una celda que siguió a un bloque cerrado
  // dentro de la celda anterior: pertenece a la misma fila.
  const rows: string[] = [];
  for (const line of lines) {
    if (line.startsWith('|') && rows.length > 0) {
      rows[rows.length - 1] += ` ${line}`;
    } else {
      rows.push(line);
    }
  }

  return rows
    .map((row) => row.replace(/(\s*\|)+\s*$/, '').trim())
    .filter((row) => row.length > 0)
    .join('\n');
}

export function splitCells(line: string): string[] {
  return line.split('|').map((cell) => cell.trim());
}

export function currencyFromCode(code: string): Currency | null {
  const c = code.trim().toUpperCase().replace(/\$$/, '');
  if (c === 'RD' || c === 'DOP') return 'DOP';
  if (c === 'US' || c === 'USD') return 'USD';
  return null;
}

/**
 * "$275.72" → 275.72 (sin moneda); "RD$ 3,500.00" → 3500 DOP; "US$ 12.00" → 12 USD.
 * Máximo 2 decimales. Cálculo en centavos enteros.
 */
export function parseAmount(raw: string): { amount: number; currency: Currency | null } | null {
  const compact = raw.replace(/\s+/g, '');
  const m = compact.match(/^(RD\$|US\$|DOP|USD|\$)?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?$/i);
  if (!m) return null;
  const [, prefix, intPart, fracPart] = m;
  const cents = Number(intPart.replace(/,/g, '')) * 100 + Number((fracPart ?? '').padEnd(2, '0'));
  const currency = prefix && prefix !== '$' ? currencyFromCode(prefix) : null;
  return { amount: cents / 100, currency };
}

/**
 * Fecha local dominicana sin zona → ISO con -04:00.
 * Acepta "16/09/2026 10:42 pm" y "16/09/2026 - 9:53 AM".
 */
export function parseLocalDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-?\s*(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$/i);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour12 = Number(m[4]);
  const minute = Number(m[5]);
  const isPm = m[6].toLowerCase() === 'p';
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour12 < 1 || hour12 > 12 || minute > 59) return null;
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  const hour24 = (hour12 % 12) + (isPm ? 12 : 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour24)}:${pad(minute)}:00-04:00`;
}

export function cleanMerchant(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}
