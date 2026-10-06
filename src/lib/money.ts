import type { Currency } from '@/types/database';

const SYMBOL: Record<Currency, string> = { DOP: 'RD$', USD: 'US$' };
const SPOKEN: Record<Currency, string> = { DOP: 'pesos', USD: 'dólares' };

const number = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function digits(amount: number): string {
  return number.format(Math.abs(amount));
}

/** Formato de montos de toda la app: `RD$ 1,234.56`, `US$ 12.00`, `-RD$ 50.00`. */
export function formatMoney(amount: number, currency: Currency): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${SYMBOL[currency]} ${digits(amount)}`;
}

/** Texto para lectores de pantalla: `1,234.56 pesos`, `menos 50.00 pesos`. */
export function moneyAccessibilityLabel(amount: number, currency: Currency): string {
  const sign = amount < 0 ? 'menos ' : '';
  return `${sign}${digits(amount)} ${SPOKEN[currency]}`;
}
