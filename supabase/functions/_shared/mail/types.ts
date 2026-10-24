import type { Enums } from '../database.types.ts';
import type { RawEmail } from '../parsers/index.ts';

export type MailProviderName = Enums<'mail_provider'>;

/**
 * Cursor de sincronización, igual para todos los proveedores. Se guarda como JSON en
 * linked_accounts.sync_cursor (lo crea public.initial_sync_cursor y lo avanza el proveedor).
 */
export interface SyncCursor {
  /** ISO: se piden correos recibidos desde aquí (menos un margen). */
  since: string;
  /** Siguiente página pendiente de una consulta en curso, o null. */
  next: string | null;
  /** Correo más nuevo visto en la consulta en curso; se vuelve `since` al terminarla. */
  maxSeen: string | null;
}

export interface Page {
  emails: RawEmail[];
  /** Cursor a guardar después de procesar esta página. */
  cursor: SyncCursor;
  hasMore: boolean;
}

export interface TokenSet {
  accessToken: string;
  /** Puede venir rotado: siempre guardar este. */
  refreshToken: string;
}

/** Contrato de un proveedor de correo. Gmail (3b) implementa lo mismo. */
export interface MailProvider {
  refreshToken(refreshToken: string): Promise<TokenSet>;
  fetchNew(accessToken: string, cursor: SyncCursor): Promise<Page>;
}

/** El proveedor rechazó la sesión (refresh token inválido o revocado): hay que volver a vincular. */
export class MailAuthError extends Error {
  /** Texto para el usuario si debe ser distinto al de "sesión expirada" del proveedor (p. ej. permiso retirado). */
  constructor(message: string, readonly userMessage?: string) {
    super(message);
  }
}

/** Falla transitoria (429, 5xx, red): se reintenta en la próxima corrida. */
export class MailTransientError extends Error {}

/**
 * Tiempo máximo de cada llamada a Google/Microsoft. Una conexión colgada aborta (→ MailTransientError) en vez de
 * retener la corrida compartida de sync-mail hasta que la plataforma la mate.
 */
export const PROVIDER_TIMEOUT_MS = 20_000;

export function parseCursor(raw: string | null): SyncCursor | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SyncCursor>;
    if (typeof value.since !== 'string' || Number.isNaN(Date.parse(value.since))) return null;
    return {
      since: value.since,
      next: typeof value.next === 'string' ? value.next : null,
      maxSeen: typeof value.maxSeen === 'string' ? value.maxSeen : null,
    };
  } catch {
    return null;
  }
}

/** El canje del código no trajo refresh token (Google solo lo entrega en el primer consentimiento). */
export class NoRefreshTokenError extends Error {}

/** El usuario no concedió el permiso de lectura de correo. */
export class MissingScopeError extends Error {}
