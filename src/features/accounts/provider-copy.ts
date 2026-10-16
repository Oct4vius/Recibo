import type { MailProviderName } from '@/types/database';

const UNLINK_NOTES: Record<MailProviderName, string> = {
  outlook: 'Para quitar también el permiso en Microsoft: account.live.com/consent',
  gmail: 'Recibo intenta quitar el permiso de tu Gmail; puedes confirmarlo en myaccount.google.com/permissions.',
};

/** Aviso al desvincular: dónde queda (o ya no queda) el permiso de cada proveedor. */
export function unlinkNote(provider: MailProviderName): string {
  return UNLINK_NOTES[provider];
}
