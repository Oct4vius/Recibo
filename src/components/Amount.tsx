import { Text } from 'react-native';
import { formatMoney, moneyAccessibilityLabel } from '@/lib/money';
import { colors, fonts, typeScale, type ColorToken } from '@/theme/tokens';
import type { Currency } from '@/types/database';

interface Props {
  value: number;
  currency: Currency;
  size?: 'hero' | 'row';
  tone?: ColorToken;
}

/** Monto. Regla del spec: nunca se inclina ni usa nota de rescate. */
export function Amount({ value, currency, size = 'row', tone = 'paper' }: Props) {
  return (
    <Text
      accessibilityLabel={moneyAccessibilityLabel(value, currency)}
      style={{
        fontFamily: fonts.amount,
        fontSize: size === 'hero' ? typeScale.amountHero : typeScale.amountRow,
        lineHeight: size === 'hero' ? typeScale.amountHero : typeScale.amountRow * 1.25,
        color: colors[tone],
        fontVariant: ['tabular-nums'],
      }}
    >
      {formatMoney(value, currency)}
    </Text>
  );
}
