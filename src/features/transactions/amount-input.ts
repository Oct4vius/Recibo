import { currencySymbol } from '@/lib/money';
import type { Currency } from '@/types/database';

export type AmountKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'backspace';

/** Tope: 9,999,999.99 (siete cifras enteras). */
export const MAX_INTEGER_DIGITS = 7;

/** Aplica una tecla al texto del monto. Máximo 2 decimales, un solo punto, sin ceros a la izquierda. */
export function pressKey(text: string, key: AmountKey): string {
  if (key === 'backspace') return text.slice(0, -1);
  if (key === '.') {
    if (text.includes('.')) return text;
    return text === '' ? '0.' : `${text}.`;
  }
  const [integer, decimals] = text.split('.');
  if (decimals !== undefined) return decimals.length >= 2 ? text : text + key;
  if (integer === '0') return key;
  if (integer.length >= MAX_INTEGER_DIGITS) return text;
  return text + key;
}

/** Texto del teclado → centavos enteros (sin coma flotante). */
export function textToCents(text: string): number {
  if (text === '') return 0;
  const [integer, decimals = ''] = text.split('.');
  return Number(integer || '0') * 100 + Number(`${decimals}00`.slice(0, 2));
}

/** Centavos → texto editable con dos decimales (para precargar un gasto al editarlo). */
export function centsToText(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** Monto mientras se escribe: `RD$ 1,234.5` (respeta lo escrito después del punto). */
export function formatAmountInput(text: string, currency: Currency): string {
  const [integer, decimals] = text.split('.');
  const grouped = (integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currencySymbol(currency)} ${grouped}${decimals !== undefined ? `.${decimals}` : ''}`;
}
