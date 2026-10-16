import type { MailProviderName } from '@/types/database';

const UNLINK_NOTES: Record<MailProviderName, string> = {
  outlook: 'Para quitar también el permiso en Microsoft: account.live.com/consent',
  gmail: 'Al desvincular, Recibo también pierde el permiso en tu cuenta de Google.',
};

/** Aviso al desvincular: dónde queda (o ya no queda) el permiso de cada proveedor. */
export function unlinkNote(provider: MailProviderName): string {
  return UNLINK_NOTES[provider];
}
