import { htmlToText } from '../parsers/normalize.ts';
import type { RawEmail } from '../parsers/index.ts';
import { nextCursor, OVERLAP_MS, PAGE_SIZE } from './cursor.ts';
import { refreshTokens } from './microsoft-auth.ts';
import { bankSenderAddresses, senderFilter } from './sender-query.ts';
import { MailAuthError, MailTransientError, PROVIDER_TIMEOUT_MS, type MailProvider, type Page, type SyncCursor } from './types.ts';

const GRAPH_MESSAGES = 'https://graph.microsoft.com/v1.0/me/messages';
export { OVERLAP_MS, PAGE_SIZE } from './cursor.ts';

interface GraphMessage {
  id: string;
  subject?: string | null;
  receivedDateTime: string;
  from?: { emailAddress?: { address?: string } };
  body?: { contentType?: string; content?: string };
}

export function toRawEmail(message: GraphMessage): RawEmail {
  const content = message.body?.content ?? '';
  return {
    messageId: message.id,
    from: message.from?.emailAddress?.address ?? '',
    subject: message.subject ?? '',
    text: message.body?.contentType === 'html' ? htmlToText(content) : content,
    receivedAt: message.receivedDateTime,
  };
}

export function firstPageUrl(addresses: readonly string[], cursor: SyncCursor): string {
  const since = new Date(Date.parse(cursor.since) - OVERLAP_MS).toISOString();
  const params = new URLSearchParams({
    $filter: senderFilter(addresses, since),
    $orderby: 'receivedDateTime asc',
    $select: 'id,subject,from,receivedDateTime,body',
    $top: String(PAGE_SIZE),
  });
  // URLSearchParams codifica `$` como %24; Graph documenta las opciones OData con `$` literal.
  return `${GRAPH_MESSAGES}?${params.toString().replaceAll('%24', '$')}`;
}

export function createGraphProvider(config: {
  clientId: string;
  addresses?: readonly string[];
  fetchImpl?: typeof fetch;
}): MailProvider {
  const fetchImpl = config.fetchImpl ?? fetch;
  const addresses = config.addresses ?? bankSenderAddresses();

  async function fetchNew(accessToken: string, cursor: SyncCursor): Promise<Page> {
    const url = cursor.next ?? firstPageUrl(addresses, cursor);
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'IdType="ImmutableId"' },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });
    } catch {
      throw new MailTransientError('graph unreachable');
    }
    if (response.status === 401) throw new MailAuthError('graph 401');
    if (response.status === 429 || response.status >= 500) throw new MailTransientError(`graph ${response.status}`);
    if (!response.ok) {
      // Un nextLink vencido no debe bloquear la cuenta: se reinicia la consulta desde `since`.
      if (cursor.next) return fetchNew(accessToken, { since: cursor.since, next: null, maxSeen: null });
      throw new Error(`graph ${response.status}`);
    }
    let json: { value?: GraphMessage[]; '@odata.nextLink'?: string };
    try {
      json = await response.json();
    } catch {
      // Un 200 con cuerpo no JSON (proxy, respuesta cortada) se reintenta en la próxima corrida.
      throw new MailTransientError('graph invalid body');
    }
    const emails = (json.value ?? []).map(toRawEmail);
    const nextLink = json['@odata.nextLink'] ?? null;
    return { emails, cursor: nextCursor(cursor, emails, nextLink), hasMore: nextLink !== null };
  }

  return {
    refreshToken: (refreshToken) => refreshTokens(config.clientId, refreshToken, fetchImpl),
    fetchNew,
  };
}
