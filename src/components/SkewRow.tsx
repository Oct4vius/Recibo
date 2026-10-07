import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { tapFeedback } from '@/lib/haptics';
import { moneyAccessibilityLabel } from '@/lib/money';
import { useMotionPreference } from '@/theme/motion';
import { durations } from '@/theme/motion-tokens';
import { angles, colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';
import type { Currency } from '@/types/database';
import { Amount } from './Amount';

interface Props {
  title: string;
  subtitle?: string;
  amount?: { value: number; currency: Currency };
  /** Etiqueta corta junto al subtítulo (p. ej. "Manual", "Ignorado"). */
  badge?: string;
  /** Atenuado: no suma (ignorado). Título y monto en `ash`. */
  muted?: boolean;
  /** Tira blanca con texto negro. */
  selected?: boolean;
  onPress?: () => void;
}

/** Tira de lista inclinada -8°. El contenido (y sobre todo el monto) queda derecho. */
export const SkewRow = memo(function SkewRow({ title, subtitle, amount, badge, muted = false, selected = false, onPress }: Props) {
  const { reduced } = useMotionPreference();
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ skewX: `${angles.row}deg` }, { translateX: pressed.value * 6 }],
  }));
  const fg = selected ? 'void' : muted ? 'ash' : 'paper';
  const label = [title, subtitle, badge, amount && moneyAccessibilityLabel(amount.value, amount.currency)]
    .filter(Boolean)
    .join(', ');

  const strip = (
    <Animated.View
      style={[
        {
          minHeight: MIN_TOUCH,
          marginVertical: 3,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: selected ? colors.paper : colors.panel,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        style,
      ]}
    >
      <View style={{ flexShrink: 1, transform: [{ skewX: `${-angles.row}deg` }] }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors[fg] }}>
          {title}
        </Text>
        {subtitle || badge ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, fontFamily: fonts.body, fontSize: typeScale.caption, color: selected ? colors.void : colors.ash }}
              >
                {subtitle}
              </Text>
            ) : null}
            {badge ? (
              <Text
                style={{
                  marginLeft: subtitle ? 8 : 0,
                  paddingHorizontal: 6,
                  borderWidth: 1,
                  borderColor: selected ? colors.void : colors.ash,
                  fontFamily: fonts.bodyStrong,
                  fontSize: typeScale.caption,
                  color: selected ? colors.void : colors.ash,
                }}
              >
                {badge}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      {amount ? (
        <View style={{ marginLeft: 12, transform: [{ skewX: `${-angles.row}deg` }] }}>
          <Amount value={amount.value} currency={amount.currency} tone={fg} />
        </View>
      ) : null}
    </Animated.View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label}>
        {strip}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      onPressIn={() => {
        if (!reduced) pressed.value = withTiming(1, { duration: durations.tap });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: durations.tap });
      }}
    >
      {strip}
    </Pressable>
  );
});
