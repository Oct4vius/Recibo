import type { RawEmail } from '../parsers/index.ts';
import { senderAddress } from '../parsers/index.ts';
import { htmlToText } from '../parsers/normalize.ts';
import { decodeBase64Url } from './base64url.ts';
import { nextCursor, OVERLAP_MS, PAGE_SIZE } from './cursor.ts';
import { refreshGoogleTokens } from './google-auth.ts';
import { bankSenderAddresses, gmailQuery } from './sender-query.ts';
import { MailAuthError, MailTransientError, type MailProvider, type Page, type SyncCursor } from './types.ts';

export const GMAIL_MESSAGES = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
export const GET_CONCURRENCY = 5;

export interface GmailPart {
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string };
  parts?: GmailPart[];
}

export interface GmailMessage {
  id: string;
  internalDate: string;
  payload?: GmailPart;
}

interface ListResponse {
  messages?: { id: string }[];
  nextPageToken?: string;
}

export function listUrl(addresses: readonly string[], cursor: SyncCursor): string {
  const since = new Date(Date.parse(cursor.since) - OVERLAP_MS).toISOString();
  const params = new URLSearchParams({
    q: gmailQuery(addresses, since),
    includeSpamTrash: 'true',
    maxResults: String(PAGE_SIZE),
  });
  if (cursor.next) params.set('pageToken', cursor.next);
  return `${GMAIL_MESSAGES}?${params.toString()}`;
}

function header(part: GmailPart | undefined, name: string): string {
  const wanted = name.toLowerCase();
  return part?.headers?.find((h) => h.name.toLowerCase() === wanted)?.value ?? '';
}

/** Primero la parte raíz (correo de una sola parte), luego en profundidad: la primera `text/html` con datos. */
export function findHtmlPart(part: GmailPart | undefined): GmailPart | null {
  if (!part) return null;
  if (part.mimeType === 'text/html' && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findHtmlPart(child);
    if (found) return found;
  }
  return null;
}

/** Decodifica el cuerpo de la parte con el charset de su Content-Type; si no se conoce, UTF-8. */
export function decodePartText(part: GmailPart): string {
  const bytes = decodeBase64Url(part.body?.data ?? '');
  const charset = header(part, 'Content-Type').match(/charset\s*=\s*"?([^";\s]+)"?/i)?.[1];
  if (charset) {
    try {
      return new TextDecoder(charset).decode(bytes);
    } catch {
      // Etiqueta desconocida: se cae a UTF-8.
    }
  }
  return new TextDecoder().decode(bytes);
}

export function toRawEmail(message: GmailMessage): RawEmail {
  const html = findHtmlPart(message.payload);
  return {
    messageId: message.id,
    from: senderAddress(header(message.payload, 'From')),
    subject: header(message.payload, 'Subject'),
    text: html ? htmlToText(decodePartText(html)) : '',
    receivedAt: new Date(Number(message.internalDate)).toISOString(),
  };
}

type Outcome<T> = { ok: true; json: T } | { ok: false; status: number };

export function createGmailProvider(config: {
  clientId: string;
  clientSecret: string;
  addresses?: readonly string[];
  fetchImpl?: typeof fetch;
}): MailProvider {
  const fetchImpl = config.fetchImpl ?? fetch;
  const addresses = config.addresses ?? bankSenderAddresses();

  /** GET autenticado. Clasifica los errores comunes; devuelve `ok: false` solo para los no clasificados. */
  async function get<T>(url: string, accessToken: string): Promise<Outcome<T>> {
    let response: Response;
    try {
      response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    } catch {
      throw new MailTransientError('gmail unreachable');
    }
    if (response.status === 401) throw new MailAuthError('gmail 401');
    if (response.status === 403) {
      const body = (await response.json().catch(() => null)) as { error?: { errors?: { reason?: string }[] } } | null;
      const reason = body?.error?.errors?.[0]?.reason;
      if (reason === 'insufficientPermissions') throw new MailAuthError('gmail insufficient permissions');
      if (reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') throw new MailTransientError('gmail rate limit');
      throw new Error('gmail 403');
    }
    if (response.status === 429 || response.status >= 500) throw new MailTransientError(`gmail ${response.status}`);
    if (!response.ok) return { ok: false, status: response.status };
    try {
      return { ok: true, json: (await response.json()) as T };
    } catch {
      // Un 200 con cuerpo no JSON (proxy, respuesta cortada) se reintenta en la próxima corrida.
      throw new MailTransientError('gmail invalid body');
    }
  }

  async function getMessage(id: string, accessToken: string): Promise<GmailMessage | null> {
    const outcome = await get<GmailMessage>(`${GMAIL_MESSAGES}/${encodeURIComponent(id)}?format=full`, accessToken);
    if (outcome.ok) return outcome.json;
    // Borrado entre list y get: se salta.
    if (outcome.status === 404) return null;
    throw new Error(`gmail ${outcome.status}`);
  }

  async function fetchNew(accessToken: string, cursor: SyncCursor): Promise<Page> {
    const list = await get<ListResponse>(listUrl(addresses, cursor), accessToken);
    if (!list.ok) {
      // Un pageToken vencido no debe bloquear la cuenta: se reinicia la consulta desde `since`.
      if (cursor.next) return fetchNew(accessToken, { since: cursor.since, next: null, maxSeen: null });
      throw new Error(`gmail ${list.status}`);
    }
    const ids = (list.json.messages ?? []).map((m) => m.id);
    const messages: (GmailMessage | null)[] = [];
    for (let i = 0; i < ids.length; i += GET_CONCURRENCY) {
      messages.push(...(await Promise.all(ids.slice(i, i + GET_CONCURRENCY).map((id) => getMessage(id, accessToken)))));
    }
    const emails = messages.filter((m): m is GmailMessage => m !== null).map(toRawEmail);
    const next = list.json.nextPageToken ?? null;
    return { emails, cursor: nextCursor(cursor, emails, next), hasMore: next !== null };
  }

  return {
    refreshToken: (refreshToken) => refreshGoogleTokens(config.clientId, config.clientSecret, refreshToken, fetchImpl),
    fetchNew,
  };
}
