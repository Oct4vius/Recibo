import { inflateRawSync } from 'node:zlib';
import { RateSourceError } from './types.ts';

// Lector mínimo de xlsx (zip + XML) sin dependencias. Solo entiende lo que trae el archivo del BCRD:
// celdas numéricas, cadenas compartidas y cadenas en línea. Lo demás lanza en vez de adivinar.

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
export const MAX_ENTRY_BYTES = 64 * 1024 * 1024;

/** Lector de zip perezoso: lee el directorio central y solo descomprime los archivos que se piden. */
export interface ZipReader {
  /** Contenido de un archivo, o undefined si no existe. Lanza si está corrupto o supera `maxBytes`. */
  read(name: string, maxBytes?: number): Uint8Array | undefined;
}

interface ZipEntry {
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

export function openZip(bytes: Uint8Array): ZipReader {
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
  const entries = new Map<string, ZipEntry>();
  for (let n = 0; n < count; n++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) {
      throw new RateSourceError('the zip directory is corrupted');
    }
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.set(name, {
      method: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      uncompressedSize: view.getUint32(offset + 24, true),
      localOffset: view.getUint32(offset + 42, true),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return {
    read(name, maxBytes = MAX_ENTRY_BYTES) {
      const entry = entries.get(name);
      if (!entry) return undefined;
      const { localOffset, compressedSize, uncompressedSize, method } = entry;
      if (uncompressedSize > maxBytes) throw new RateSourceError('a zip entry is too large');
      if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) {
        throw new RateSourceError('the zip is corrupted');
      }
      const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
      const raw = bytes.subarray(dataStart, dataStart + compressedSize);
      if (raw.length !== compressedSize) throw new RateSourceError('the zip is truncated');
      if (method === 0) {
        if (raw.length > maxBytes) throw new RateSourceError('a zip entry is too large');
        return raw;
      }
      if (method !== 8) throw new RateSourceError('unsupported zip compression');
      let inflated: Uint8Array;
      try {
        // maxOutputLength corta la descompresión donde el runtime lo respeta; la declaración y el chequeo final cubren el resto.
        inflated = inflateRawSync(raw, { maxOutputLength: maxBytes }) as unknown as Uint8Array;
      } catch {
        throw new RateSourceError('a zip entry could not be decompressed or is too large');
      }
      if (inflated.length > maxBytes) throw new RateSourceError('a zip entry is too large');
      return inflated;
    },
  };
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
  const zip = openZip(bytes);
  const workbook = requireText(zip.read('xl/workbook.xml'), 'workbook.xml');
  const sheetTag = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((m) => attributes(m[0])).find((a) => a.name === sheetName);
  if (!sheetTag) throw new RateSourceError(`the workbook has no sheet ${sheetName}`);
  const rels = requireText(zip.read('xl/_rels/workbook.xml.rels'), 'workbook rels');
  const target = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => attributes(m[0])).find((a) => a.Id === sheetTag['r:id'])?.Target;
  if (!target) throw new RateSourceError(`the sheet ${sheetName} has no file`);
  const stringsXml = zip.read('xl/sharedStrings.xml');
  const strings = stringsXml ? sharedStrings(new TextDecoder().decode(stringsXml)) : [];
  const sheet = requireText(zip.read(`xl/${target.replace(/^\/?(xl\/)?/, '')}`), `sheet ${sheetName}`);

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
