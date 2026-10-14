import { htmlToText } from '../parsers/normalize.ts';
import type { RawEmail } from '../parsers/index.ts';
import { refreshTokens } from './microsoft-auth.ts';
import { bankSenderDomains, senderSearch } from './sender-query.ts';
import { MailAuthError, MailTransientError, type MailProvider, type Page, type SyncCursor } from './types.ts';

const GRAPH_MESSAGES = 'https://graph.microsoft.com/v1.0/me/messages';
export const PAGE_SIZE = 50;
/** Margen hacia atrás en cada consulta, por correos con la misma hora. La ingesta no duplica. */
export const OVERLAP_MS = 10 * 60_000;

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

export function firstPageUrl(domains: readonly string[], cursor: SyncCursor): string {
  const since = new Date(Date.parse(cursor.since) - OVERLAP_MS).toISOString();
  const params = new URLSearchParams({
    $search: `"${senderSearch(domains, since)}"`,
    $select: 'id,subject,from,receivedDateTime,body',
    $top: String(PAGE_SIZE),
  });
  // URLSearchParams codifica `$` como %24; Graph documenta las opciones OData con `$` literal.
  return `${GRAPH_MESSAGES}?${params.toString().replaceAll('%24', '$')}`;
}

function newest(a: string | null, b: string): string {
  return a === null || Date.parse(b) > Date.parse(a) ? b : a;
}

export function nextCursor(cursor: SyncCursor, emails: readonly RawEmail[], nextLink: string | null): SyncCursor {
  const maxSeen = emails.reduce<string | null>((max, email) => newest(max, email.receivedAt), cursor.maxSeen);
  if (nextLink) return { since: cursor.since, next: nextLink, maxSeen };
  return { since: maxSeen === null ? cursor.since : newest(cursor.since, maxSeen), next: null, maxSeen: null };
}

export function createGraphProvider(config: {
  clientId: string;
  domains?: readonly string[];
  fetchImpl?: typeof fetch;
}): MailProvider {
  const fetchImpl = config.fetchImpl ?? fetch;
  const domains = config.domains ?? bankSenderDomains();

  async function fetchNew(accessToken: string, cursor: SyncCursor): Promise<Page> {
    const url = cursor.next ?? firstPageUrl(domains, cursor);
    let response: Response;
    try {
      response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'IdType="ImmutableId"' } });
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
    const json = (await response.json()) as { value?: GraphMessage[]; '@odata.nextLink'?: string };
    const emails = (json.value ?? []).map(toRawEmail);
    const nextLink = json['@odata.nextLink'] ?? null;
    return { emails, cursor: nextCursor(cursor, emails, nextLink), hasMore: nextLink !== null };
  }

  return {
    refreshToken: (refreshToken) => refreshTokens(config.clientId, refreshToken, fetchImpl),
    fetchNew,
  };
}
