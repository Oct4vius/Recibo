import type { BankCode, ParseResult, RawEmail } from '../parsers/index.ts';
import { MailAuthError, MailTransientError, type MailProvider } from '../mail/types.ts';
import { DataRejectedError, type SyncAccount, type SyncRepository } from './repository.ts';
import { toIngestRows, toUnparsed, type IngestRow, type UnparsedEmail } from './rows.ts';

export const TRANSIENT_ERROR = 'Error temporal del proveedor de correo.';
export const SYNC_FAILED = 'No se pudo sincronizar. Se reintentará en la próxima corrida.';

export interface SyncDeps {
  provider: MailProvider;
  repo: SyncRepository;
  parse: (email: RawEmail) => ParseResult;
  maxPages: number;
  now: () => Date;
  /** Texto de "sesión expirada" del proveedor de esta cuenta (lo da el registro). */
  expiredSession: string;
  /** Epoch ms: no se piden más páginas después (lo guardado queda; el resto sigue en la próxima corrida). */
  deadline?: number;
}

export interface SyncOutcome {
  status: 'ok' | 'skipped' | 'auth_error' | 'transient_error' | 'error';
  fetched: number;
  parsed: number;
  unparsed: number;
  pages: number;
}

interface ParsedEmail {
  email: RawEmail;
  bankCode: BankCode;
  rows: IngestRow[];
}

interface PageIngest {
  status: 'ok' | 'skipped';
  rejected: ParsedEmail[];
  codes: string[];
}

/**
 * La página va en una sola llamada (una transacción). Si la base rechaza el valor de una fila (DataRejectedError), se
 * reintenta correo por correo y los rechazados se devuelven aparte. Si los rechaza TODOS (más de uno), no es un correo
 * malo sino algo que afecta la página (un despliegue, un bug): sube el error y la página se reintenta entera.
 */
async function ingestPage(accountId: string, parsed: ParsedEmail[], repo: SyncRepository): Promise<PageIngest> {
  const rows = parsed.flatMap((p) => p.rows);
  if (rows.length === 0) return { status: 'ok', rejected: [], codes: [] };
  let pageError: DataRejectedError;
  try {
    return { status: (await repo.ingest(accountId, rows)).status, rejected: [], codes: [] };
  } catch (err) {
    if (!(err instanceof DataRejectedError)) throw err;
    pageError = err;
  }
  const rejected: ParsedEmail[] = [];
  const codes = new Set<string>();
  for (const p of parsed) {
    try {
      if ((await repo.ingest(accountId, p.rows)).status === 'skipped') return { status: 'skipped', rejected, codes: [...codes] };
    } catch (err) {
      if (!(err instanceof DataRejectedError)) throw err;
      rejected.push(p);
      codes.add(err.code);
    }
  }
  if (parsed.length > 1 && rejected.length === parsed.length) throw pageError;
  return { status: 'ok', rejected, codes: [...codes] };
}

/** Una cuenta: token rotado → páginas → parseo → ingesta → cursor → estado → log. Sin SQL ni regex. */
export async function syncAccount(account: SyncAccount, deps: SyncDeps): Promise<SyncOutcome> {
  const { provider, repo, parse, maxPages, now } = deps;
  const startedAt = now().toISOString();
  const outcome: SyncOutcome = { status: 'ok', fetched: 0, parsed: 0, unparsed: 0, pages: 0 };
  let error: string | null = null;
  let stored: string | null = null;
  let rejectedCount = 0;
  const rejectedCodes = new Set<string>();
  try {
    stored = await repo.readToken(account.id);
    if (!stored) throw new MailAuthError('no token');
    const tokens = await provider.refreshToken(stored);
    // Microsoft rota el refresh token: se guarda antes de traer nada.
    if (tokens.refreshToken !== stored) {
      await repo.saveToken(account.id, tokens.refreshToken);
      // El token guardado ahora es el de esta corrida: el chequeo de solapamiento solo debe detectar a otra corrida.
      stored = tokens.refreshToken;
    }

    let cursor = account.cursor;
    let hasMore = true;
    const beforeDeadline = () => deps.deadline === undefined || now().getTime() < deps.deadline;
    while (hasMore && outcome.pages < maxPages && beforeDeadline()) {
      const page = await provider.fetchNew(tokens.accessToken, cursor);
      outcome.pages++;
      outcome.fetched += page.emails.length;
      const parsed: ParsedEmail[] = [];
      const unparsed: UnparsedEmail[] = [];
      for (const email of page.emails) {
        const result = parse(email);
        if (result.kind === 'parsed') {
          parsed.push({ email, bankCode: result.bankCode, rows: toIngestRows(email, result.transactions) });
          outcome.parsed++;
        } else if (result.kind === 'unparsed') {
          unparsed.push(toUnparsed(email, result.bankCode));
          outcome.unparsed++;
        }
      }
      const ingested = await ingestPage(account.id, parsed, repo);
      if (ingested.status === 'skipped') {
        outcome.status = 'skipped';
        break;
      }
      // Un correo cuyos datos la base rechaza queda como muestra en unparsed_emails en vez de bloquear la cuenta.
      for (const { email, bankCode } of ingested.rejected) {
        unparsed.push(toUnparsed(email, bankCode));
        outcome.parsed--;
        outcome.unparsed++;
      }
      rejectedCount += ingested.rejected.length;
      ingested.codes.forEach((code) => rejectedCodes.add(code));
      if (unparsed.length > 0) await repo.saveUnparsed(account, unparsed);
      await repo.advanceCursor(account.id, page.cursor);
      cursor = page.cursor;
      hasMore = page.hasMore;
    }
    if (outcome.status === 'ok') {
      await repo.markAccount(account.id, { status: 'active', lastError: null, lastSyncAt: now().toISOString() });
    }
    // Solo para el operador (sync_logs): la cuenta sigue sana, pero hubo correos apartados que conviene revisar.
    if (rejectedCount > 0) error = `${rejectedCount} email(s) rejected by the database (${[...rejectedCodes].join(', ')})`;
  } catch (err) {
    // Otra corrida pudo rotar el token mientras tanto (el candado es por página, no por corrida):
    // si el token guardado cambió, esta corrida termina como 'skipped' en vez de marcar la cuenta.
    if (err instanceof MailAuthError && stored !== null && (await repo.readToken(account.id)) !== stored) {
      outcome.status = 'skipped';
    } else if (err instanceof MailAuthError) {
      outcome.status = 'auth_error';
      error = err.userMessage ?? deps.expiredSession;
      await repo.markAccount(account.id, { status: 'error', lastError: error, lastSyncAt: null });
    } else if (err instanceof MailTransientError) {
      outcome.status = 'transient_error';
      error = TRANSIENT_ERROR;
    } else {
      outcome.status = 'error';
      // El texto crudo solo va a sync_logs; la cuenta muestra un aviso fijo y sigue activa para reintentar.
      error = err instanceof Error ? err.message : 'unknown error';
      await repo.markAccount(account.id, { status: 'active', lastError: SYNC_FAILED, lastSyncAt: null });
    }
  }
  await repo.logSync({
    accountId: account.id,
    userId: account.userId,
    startedAt,
    finishedAt: now().toISOString(),
    fetched: outcome.fetched,
    parsed: outcome.parsed,
    unparsed: outcome.unparsed,
    error,
  });
  return outcome;
}
