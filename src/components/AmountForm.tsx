import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { centsToText, pressKey, textToCents } from '@/features/transactions/amount-input';
import { AMOUNT_REQUIRED } from '@/features/transactions/messages';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { Currency } from '@/types/database';
import { AmountDisplay } from './AmountDisplay';
import { AmountKeypad } from './AmountKeypad';
import { SkewButton } from './SkewButton';

interface Props {
  currency: Currency;
  /** Valor inicial en centavos; 0 empieza vacío. */
  initialCents: number;
  saving: boolean;
  error: string | null;
  onSave: (cents: number) => void;
  /** Contenido entre el monto y el teclado (p. ej. un aviso). */
  children?: ReactNode;
}

/** Monto gigante + teclado propio + "Guardar" (desactivado en cero). Trabaja en centavos enteros. */
export function AmountForm({ currency, initialCents, saving, error, onSave, children }: Props) {
  const [text, setText] = useState(() => (initialCents > 0 ? centsToText(initialCents) : ''));
  const cents = textToCents(text);
  return (
    <View>
      <AmountDisplay text={text} currency={currency} active onPress={() => undefined} />
      {children}
      <AmountKeypad onKey={(key) => setText((current) => pressKey(current, key))} />
      <View style={{ marginTop: 16 }}>
        <SkewButton
          label="Guardar"
          onPress={() => onSave(cents)}
          disabled={cents === 0}
          loading={saving}
          accessibilityHint={cents === 0 ? AMOUNT_REQUIRED : undefined}
        />
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
