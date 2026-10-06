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
  /** Tira blanca con texto negro. */
  selected?: boolean;
  onPress?: () => void;
}

/** Tira de lista inclinada -8°. El contenido (y sobre todo el monto) queda derecho. */
export function SkewRow({ title, subtitle, amount, selected = false, onPress }: Props) {
  const { reduced } = useMotionPreference();
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ skewX: `${angles.row}deg` }, { translateX: pressed.value * 6 }],
  }));
  const fg = selected ? 'void' : 'paper';
  const label = [title, subtitle, amount && moneyAccessibilityLabel(amount.value, amount.currency)]
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
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.body, fontSize: typeScale.caption, color: selected ? colors.void : colors.ash }}
          >
            {subtitle}
          </Text>
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
}
