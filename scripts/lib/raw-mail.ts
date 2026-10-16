import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { decodeBase64Url } from '../../supabase/functions/_shared/mail/base64url';
import type { MailProviderName } from '../../supabase/functions/_shared/mail/types';

/** Petición del MIME original de un mensaje. Sin `Authorization`: lo agrega el script. */
export function rawMessageRequest(provider: MailProviderName, messageId: string): { url: string; headers: Record<string, string> } {
  const id = encodeURIComponent(messageId);
  return provider === 'outlook'
    ? { url: `https://graph.microsoft.com/v1.0/me/messages/${id}/$value`, headers: { Prefer: 'IdType="ImmutableId"' } }
    : { url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=raw`, headers: {} };
}

/** Graph entrega el MIME tal cual; Gmail lo entrega en base64url dentro de `raw`. */
export async function rawMessageBytes(provider: MailProviderName, response: Response): Promise<Uint8Array> {
  if (provider === 'outlook') return new Uint8Array(await response.arrayBuffer());
  const json = (await response.json()) as { raw?: unknown };
  if (typeof json.raw !== 'string') throw new Error('La respuesta de Gmail no trae el campo raw');
  return decodeBase64Url(json.raw);
}

/** Ruta local de la descarga: por banco, con fecha y hash; nada del id crudo en el nombre (seguro en Windows). */
export function downloadPath(bankCode: string | null, receivedAt: string | null, messageId: string): string {
  const stamp = receivedAt && !Number.isNaN(Date.parse(receivedAt)) ? new Date(receivedAt).toISOString().slice(0, 19).replaceAll(':', '-') : 'sin-fecha';
  const hash = createHash('sha256').update(messageId).digest('hex').slice(0, 12);
  return join('fixtures-raw', bankCode ?? '_unknown', '_downloaded', `${stamp}-${hash}.eml`);
}
