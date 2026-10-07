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
  /** Apagado (p. ej. "Guardar" sin monto): fondo `panel`, texto `ash`, no responde. */
  disabled?: boolean;
  accessibilityHint?: string;
}

/** Botón inclinado: al tocarlo se hunde 4 dp en diagonal y vibra (sin desplazamiento si se redujeron animaciones). */
export function SkewButton({ label, onPress, variant = 'primary', loading = false, disabled = false, accessibilityHint }: Props) {
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
  const inactive = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: inactive }}
      disabled={inactive}
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
            backgroundColor: primary ? (disabled ? colors.panel : colors.blood) : 'transparent',
            borderWidth: primary ? 0 : 2,
            borderColor: disabled ? colors.ash : colors.paper,
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
              color: disabled ? colors.ash : colors.paper,
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
