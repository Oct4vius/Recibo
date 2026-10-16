import type { IgnoredEmail, RawEmail } from '../types.ts';

const SUBJECT = /^Transacciones entre productos BHD y a otros Bancos$/i;

/**
 * Transferencia recibida: comparte asunto con `bhd/transfer`, pero trae `Producto destino:` y no `Producto origen:`.
 * Es un ingreso y v1 no registra ingresos.
 */
export const transferIn: IgnoredEmail = {
  id: 'bhd/transfer-in',

  matches(email: RawEmail): boolean {
    if (!SUBJECT.test(email.subject.trim())) return false;
    const lines = email.text.split('\n');
    const has = (label: RegExp) => lines.some((line) => label.test(line));
    return has(/^Producto destino:/i) && !has(/^Producto origen:/i);
  },
};
