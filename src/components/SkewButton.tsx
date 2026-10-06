import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { tapFeedback } from '@/lib/haptics';
import { useMotionPreference } from '@/theme/motion';
import { durations } from '@/theme/motion-tokens';
import { angles, colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  accessibilityHint?: string;
}

/** Botón inclinado: al tocarlo se hunde 4 dp en diagonal y vibra (sin desplazamiento si se redujeron animaciones). */
export function SkewButton({ label, onPress, variant = 'primary', loading = false, accessibilityHint }: Props) {
  const { reduced } = useMotionPreference();
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [
      { skewX: `${angles.row}deg` },
      { translateX: pressed.value * 4 },
      { translateY: pressed.value * 2 },
    ],
  }));
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
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
      style={{ minHeight: MIN_TOUCH }}
    >
      <Animated.View
        style={[
          {
            minHeight: MIN_TOUCH,
            paddingHorizontal: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: primary ? colors.blood : 'transparent',
            borderWidth: primary ? 0 : 2,
            borderColor: colors.paper,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.paper} />
        ) : (
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: typeScale.displaySm,
              color: colors.paper,
              transform: [{ skewX: `${-angles.row}deg` }],
            }}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
