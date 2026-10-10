import { Text } from 'react-native';
import { formatMoney, moneyAccessibilityLabel } from '@/lib/money';
import { colors, fonts, typeScale, type ColorToken } from '@/theme/tokens';
import type { Currency } from '@/types/database';

const FONT_SIZE = { hero: typeScale.amountHero, large: typeScale.amountLarge, row: typeScale.amountRow } as const;
const LINE_HEIGHT = {
  hero: typeScale.amountHero,
  large: typeScale.amountLarge * 1.15,
  row: typeScale.amountRow * 1.25,
} as const;

interface Props {
  value: number;
  currency: Currency;
  size?: keyof typeof FONT_SIZE;
  tone?: ColorToken;
}

/** Monto. Regla del spec: nunca se inclina ni usa nota de rescate. */
export function Amount({ value, currency, size = 'row', tone = 'paper' }: Props) {
  return (
    <Text
      accessibilityLabel={moneyAccessibilityLabel(value, currency)}
      style={{
        fontFamily: fonts.amount,
        fontSize: FONT_SIZE[size],
        lineHeight: LINE_HEIGHT[size],
        color: colors[tone],
        fontVariant: ['tabular-nums'],
      }}
    >
      {formatMoney(value, currency)}
    </Text>
  );
}
