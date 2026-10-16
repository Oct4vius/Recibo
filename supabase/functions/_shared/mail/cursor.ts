import type { RawEmail } from '../parsers/index.ts';
import type { SyncCursor } from './types.ts';

export const PAGE_SIZE = 50;
/** Margen hacia atrás en cada consulta, por correos con la misma hora. La ingesta no duplica. */
export const OVERLAP_MS = 10 * 60_000;

function newest(a: string | null, b: string): string {
  return a === null || Date.parse(b) > Date.parse(a) ? b : a;
}

/** `next` es el nextLink de Graph o el pageToken de Gmail. */
export function nextCursor(cursor: SyncCursor, emails: readonly RawEmail[], next: string | null): SyncCursor {
  const maxSeen = emails.reduce<string | null>((max, email) => newest(max, email.receivedAt), cursor.maxSeen);
  if (next) return { since: cursor.since, next, maxSeen };
  return { since: maxSeen === null ? cursor.since : newest(cursor.since, maxSeen), next: null, maxSeen: null };
}
