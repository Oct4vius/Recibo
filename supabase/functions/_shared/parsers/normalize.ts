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
      const isSurrogate = n >= 0xd800 && n <= 0xdfff;
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff && !isSurrogate ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code] ?? match;
  });
}

/** Separador temporal de filas; \s no lo matchea, así que sobrevive al colapso de espacios. */
const ROW_BREAK = '\u0000';
const BLOCK_END = /^(?:<br\b[^>]*>|<\/(?:tr|p|div|li|h[1-6]|table|thead|tbody|ul|ol)\s*>)$/i;
const CELL_END = /^<\/t[dh]\s*>$/i;
const RAW_TEXT_OPEN = /^<(script|style)\b/i;

/**
 * Quita comentarios, script/style y etiquetas en una sola pasada lineal: cada búsqueda de cierre avanza el cursor o,
 * si no hay cierre, se recuerda que no lo habrá más adelante. Con regex globales, un correo con miles de "<" sin cerrar
 * costaba tiempo cuadrático y frenaba sync-mail para todas las cuentas. Mismo resultado que las regex en HTML válido:
 * comentarios y script/style fuera, celdas → " | ", bloques → ROW_BREAK, el resto de etiquetas → " ".
 */
function stripMarkup(html: string): string {
  const parts: string[] = [];
  let noCommentEnd = false;
  const noRawTextEnd = new Set<string>();
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;
    parts.push(html.slice(i, lt));
    if (!noCommentEnd && html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      if (end !== -1) {
        i = end + 3;
        continue;
      }
      noCommentEnd = true;
    }
    const gt = html.indexOf('>', lt + 1);
    if (gt === -1) {
      // Ningún ">" más adelante: el resto no tiene etiquetas y queda como texto.
      i = lt;
      break;
    }
    const tag = html.slice(lt, gt + 1);
    const rawText = tag.match(RAW_TEXT_OPEN)?.[1].toLowerCase();
    if (rawText && !noRawTextEnd.has(rawText)) {
      const close = new RegExp(`</${rawText}\\s*>`, 'gi');
      close.lastIndex = gt + 1;
      const found = close.exec(html);
      if (found) {
        i = found.index + found[0].length;
        continue;
      }
      noRawTextEnd.add(rawText);
    }
    parts.push(CELL_END.test(tag) ? ' | ' : BLOCK_END.test(tag) ? ROW_BREAK : ' ');
    i = gt + 1;
  }
  parts.push(html.slice(i));
  return parts.join('');
}

/** Quita los pipes y espacios del final de una fila sin regex (la regex equivalente era cuadrática con muchas celdas). */
function trimTrailingPipes(row: string): string {
  let end = row.length;
  while (end > 0 && (row[end - 1] === '|' || /\s/.test(row[end - 1]))) end--;
  return row.slice(0, end).trim();
}

/**
 * HTML del banco → texto estable para los parsers.
 * - Una línea por fila de tabla o bloque (tr, p, div, br, ...).
 * - Celdas (td/th) separadas por " | ". Celdas vacías intermedias se conservan;
 *   las celdas vacías AL FINAL de la fila se descartan (todos los pipes finales se quitan).
 * - Sin líneas vacías, sin espacios dobles.
 * - Una línea que empieza con "|" se fusiona con la fila anterior (bloques dentro de una celda).
 */
export function htmlToText(html: string): string {
  const decoded = decodeEntities(stripMarkup(html)).replace(/[\s\u00a0]+/g, ' ');

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
    .map(trimTrailingPipes)
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
 * Solo montos que `transactions.amount` acepta (> 0 y que caben en numeric(14,2)); fuera de eso → null y el correo cae
 * en unparsed_emails, en vez de que la base rechace la página entera y la cuenta deje de sincronizar.
 */
const MAX_INTEGER_DIGITS = 12;

export function parseAmount(raw: string): { amount: number; currency: Currency | null } | null {
  const compact = raw.replace(/\s+/g, '');
  const m = compact.match(/^(RD\$|US\$|DOP|USD|\$)?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?$/i);
  if (!m) return null;
  const [, prefix, intPart, fracPart] = m;
  const digits = intPart.replace(/,/g, '').replace(/^0+(?=\d)/, '');
  if (digits.length > MAX_INTEGER_DIGITS) return null;
  const cents = Number(digits) * 100 + Number((fracPart ?? '').padEnd(2, '0'));
  if (cents <= 0) return null;
  const currency = prefix && prefix !== '$' ? currencyFromCode(prefix) : null;
  return { amount: cents / 100, currency };
}

/**
 * Fecha local dominicana sin zona → ISO con -04:00.
 * Acepta "16/09/2026 10:42 pm", "16/09/2026 - 9:53 AM" y "04/09/2026 | 9:24 AM" (fecha y hora en celdas separadas).
 */
export function parseLocalDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-|]?\s*(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$/i);
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

/**
 * Valor de una fila clave-valor. Tolera dos formas que produce htmlToText:
 *   "Monto: | RD$ 3,500.00"   → "RD$ 3,500.00"
 *   "Monto:"  (valor vacío)   → ""
 * Real HTML, tras la fusión de líneas de continuación de htmlToText, nunca deja
 * el valor en la línea siguiente: no se adivina ahí.
 */
export function keyValue(lines: string[], label: RegExp): string | null {
  const index = lines.findIndex((line) => label.test(line));
  if (index === -1) return null;
  const line = lines[index];
  const pipe = line.indexOf('|');
  if (pipe !== -1) return line.slice(pipe + 1).trim();
  return line.replace(label, '').trim();
}

export function cleanMerchant(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}
