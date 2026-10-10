import { Pressable, Text, View } from 'react-native';
import { moneyAccessibilityLabel } from '@/lib/money';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { Currency } from '@/types/database';
import { formatAmountInput, textToCents } from '@/features/transactions/amount-input';

interface Props {
  text: string;
  currency: Currency;
  /** El teclado propio está activo: se muestra el cursor rojo. */
  active: boolean;
  onPress: () => void;
}

/** Monto gigante mientras se escribe (cifras de ancho fijo, nunca inclinado). Tocarlo vuelve al teclado propio. */
export function AmountDisplay({ text, currency, active, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Monto: ${moneyAccessibilityLabel(textToCents(text) / 100, currency)}`}
      accessibilityHint="Muestra el teclado de montos"
      accessibilityLiveRegion="polite"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: typeScale.amountHero + 8, marginBottom: 12 }}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          flexShrink: 1,
          fontFamily: fonts.amount,
          fontSize: typeScale.amountHero,
          lineHeight: typeScale.amountHero,
          color: colors.paper,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatAmountInput(text, currency)}
      </Text>
      {active ? (
        <View style={{ width: 4, height: typeScale.amountHero * 0.8, marginLeft: 4, backgroundColor: colors.blood }} />
      ) : null}
    </Pressable>
  );
}
