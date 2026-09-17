import PostalMime from 'postal-mime';
import { htmlToText } from '../../supabase/functions/_shared/parsers/normalize.ts';
import type { RawEmail } from '../../supabase/functions/_shared/parsers/types.ts';

/**
 * Convierte un .eml crudo en el RawEmail que reciben los parsers.
 * Solo se usa en desarrollo (fixtures). En producción Gmail/Graph entregan el HTML ya decodificado.
 */
export async function emlToRawEmail(bytes: Uint8Array): Promise<RawEmail> {
  const parsed = await PostalMime.parse(bytes);
  const html = parsed.html ?? '';
  if (!html) throw new Error('El .eml no tiene parte text/html');
  if (!parsed.messageId) throw new Error('El .eml no tiene header Message-ID');
  if (!parsed.date) throw new Error('El .eml no tiene header Date');
  return {
    messageId: parsed.messageId,
    from: parsed.from?.address ?? '',
    subject: parsed.subject ?? '',
    text: htmlToText(html),
    receivedAt: parsed.date,
  };
}
