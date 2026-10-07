import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

type Props = Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  /** Mensaje bajo el campo; se anuncia al lector de pantalla. */
  error?: string | null;
};

/** Campo de texto: etiqueta arriba, caja `panel` con barra roja a la izquierda cuando tiene foco. */
export function TextField({ label, error, autoCapitalize = 'none', autoCorrect = false, onFocus, onBlur, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        importantForAccessibility="no"
        style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.ash, marginBottom: 6 }}
      >
        {label}
      </Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        selectionColor={colors.blood}
        style={{
          minHeight: MIN_TOUCH,
          paddingHorizontal: 14,
          backgroundColor: colors.panel,
          borderLeftWidth: 4,
          borderLeftColor: focused ? colors.blood : colors.panel,
          color: colors.paper,
          fontFamily: fonts.body,
          fontSize: typeScale.body,
        }}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 6 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
