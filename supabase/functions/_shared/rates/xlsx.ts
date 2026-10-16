import { inflateRawSync } from 'node:zlib';
import { RateSourceError } from './types.ts';

// Lector mínimo de xlsx (zip + XML) sin dependencias. Solo entiende lo que trae el archivo del BCRD:
// celdas numéricas, cadenas compartidas y cadenas en línea. Lo demás lanza en vez de adivinar.

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;

/** Contenido de cada archivo del zip, por nombre. */
export function readZipEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new RateSourceError('the document is not a zip file');
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) {
      throw new RateSourceError('the zip directory is corrupted');
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (uncompressedSize > MAX_ENTRY_BYTES) throw new RateSourceError('a zip entry is too large');
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) {
      throw new RateSourceError('the zip is corrupted');
    }
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    if (raw.length !== compressedSize) throw new RateSourceError('the zip is truncated');
    if (method === 0) {
      entries.set(name, raw);
    } else if (method === 8) {
      try {
        entries.set(name, inflateRawSync(raw) as unknown as Uint8Array);
      } catch {
        throw new RateSourceError('a zip entry could not be decompressed');
      }
    } else {
      throw new RateSourceError('unsupported zip compression');
    }
  }
  return entries;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

function attributes(tag: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) found[match[1]] = decodeEntities(match[2]);
  return found;
}

function requireText(bytes: Uint8Array | undefined, what: string): string {
  if (!bytes) throw new RateSourceError(`the workbook has no ${what}`);
  return new TextDecoder().decode(bytes);
}

function textRuns(xml: string): string {
  return decodeEntities([...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
}

function sharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((si) => textRuns(si[1]));
}

/** Una fila: letra de columna → texto o número ya leído. Las celdas vacías no aparecen. */
export type SheetRow = Map<string, string | number>;

/** Filas de la hoja con ese nombre, en orden. */
export function readSheetRows(bytes: Uint8Array, sheetName: string): SheetRow[] {
  const entries = readZipEntries(bytes);
  const workbook = requireText(entries.get('xl/workbook.xml'), 'workbook.xml');
  const sheetTag = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((m) => attributes(m[0])).find((a) => a.name === sheetName);
  if (!sheetTag) throw new RateSourceError(`the workbook has no sheet ${sheetName}`);
  const rels = requireText(entries.get('xl/_rels/workbook.xml.rels'), 'workbook rels');
  const target = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => attributes(m[0])).find((a) => a.Id === sheetTag['r:id'])?.Target;
  if (!target) throw new RateSourceError(`the sheet ${sheetName} has no file`);
  const stringsXml = entries.get('xl/sharedStrings.xml');
  const strings = stringsXml ? sharedStrings(new TextDecoder().decode(stringsXml)) : [];
  const sheet = requireText(entries.get(`xl/${target.replace(/^\/?(xl\/)?/, '')}`), `sheet ${sheetName}`);

  const rows: SheetRow[] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: SheetRow = new Map();
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = attributes(cell[1]);
      const column = /^([A-Z]+)\d+$/.exec(attrs.r ?? '')?.[1];
      const body = cell[2];
      if (!column || body === undefined) continue;
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let parsed: string | number | undefined;
      if (attrs.t === 's') {
        parsed = value === undefined ? undefined : strings[Number(value)];
        if (value !== undefined && parsed === undefined) throw new RateSourceError('a cell points to a missing shared string');
      } else if (attrs.t === 'inlineStr') {
        parsed = textRuns(body);
      } else if (attrs.t === 'str') {
        parsed = value === undefined ? undefined : decodeEntities(value);
      } else if (attrs.t === undefined || attrs.t === 'n') {
        parsed = value === undefined ? undefined : Number(value);
      } else {
        throw new RateSourceError('a cell has an unsupported type');
      }
      if (parsed !== undefined && parsed !== '') row.set(column, parsed);
    }
    rows.push(row);
  }
  return rows;
}
