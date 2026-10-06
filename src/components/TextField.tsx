import { useState } from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

interface Props {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
}

/** Campo de texto: etiqueta arriba, caja `panel` con barra roja a la izquierda cuando tiene foco. */
export function TextField({ label, value, onChangeText, secureTextEntry, keyboardType, autoComplete }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.ash, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.ash}
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
    </View>
  );
}
