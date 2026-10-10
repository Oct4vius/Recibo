import { currencySymbol, formatMoney } from '@/lib/money';

/** `RD$ 60.00 por US$ 1`. */
export function usdRateText(rate: number): string {
  return `${formatMoney(rate, 'DOP')} por ${currencySymbol('USD')} 1`;
}
