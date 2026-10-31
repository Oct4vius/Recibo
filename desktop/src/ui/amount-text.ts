import { MAX_INTEGER_DIGITS, textToCents } from '@/features/transactions/amount-input';

const AMOUNT_SHAPE = new RegExp(`^\\d{1,${MAX_INTEGER_DIGITS}}(\\.\\d{0,2})?$`);

/** Deja pasar solo dígitos y un punto (lo demás se descarta al escribir o pegar). */
export function sanitizeAmountText(text: string): string {
  const cleaned = text.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  return dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
}

/** Un monto escrito válido: hasta 7 cifras enteras, 2 decimales y mayor que cero. */
export function isAmountText(text: string): boolean {
  return AMOUNT_SHAPE.test(text) && textToCents(text) > 0;
}
