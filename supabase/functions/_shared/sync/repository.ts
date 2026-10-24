import type { MailProviderName, SyncCursor } from '../mail/types.ts';
import type { IngestRow, UnparsedEmail } from './rows.ts';

export interface SyncAccount {
  id: string;
  userId: string;
  provider: MailProviderName;
  cursor: SyncCursor;
}

export interface IngestResult {
  status: 'ok' | 'skipped';
  inserted: number;
  duplicates: number;
  paired: number;
  unmatched: number;
}

export interface SyncLog {
  accountId: string;
  userId: string;
  startedAt: string;
  finishedAt: string;
  fetched: number;
  parsed: number;
  unparsed: number;
  error: string | null;
}

/**
 * La base rechazó los datos (SQLSTATE clase 22 "data exception" o 23 "integrity constraint"): reintentar lo mismo
 * vuelve a fallar. Cualquier otro error del repositorio se trata como transitorio y se reintenta en la próxima corrida.
 */
export class DataRejectedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'DataRejectedError';
  }
}

/** Lo único que la orquestación necesita de la base. Los tests usan una implementación en memoria. */
export interface SyncRepository {
  readToken(accountId: string): Promise<string | null>;
  saveToken(accountId: string, token: string): Promise<void>;
  ingest(accountId: string, rows: IngestRow[]): Promise<IngestResult>;
  saveUnparsed(account: SyncAccount, emails: UnparsedEmail[]): Promise<void>;
  advanceCursor(accountId: string, cursor: SyncCursor): Promise<void>;
  /** `lastSyncAt` null = no tocar `last_sync_at`. */
  markAccount(accountId: string, state: { status: 'active' | 'error'; lastError: string | null; lastSyncAt: string | null }): Promise<void>;
  logSync(log: SyncLog): Promise<void>;
}
