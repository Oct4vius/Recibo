import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { tapFeedback } from '@/lib/haptics';
import { animateTo, useMotionPreference } from '@/theme/motion';
import { angles, colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 28;
const BORDER = 2;
const KNOB = 18;
const INSET = 3;
const TRAVEL = TRACK_WIDTH - 2 * BORDER - 2 * INSET - KNOB;

interface Props {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Interruptor inclinado. Encendido: riel rojo y perilla blanca; apagado: borde y perilla grises. Toda la fila es tocable. */
export function SkewToggle({ label, value, onChange, disabled = false }: Props) {
  const { reduced } = useMotionPreference();
  const knob = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    knob.value = animateTo(value ? 1 : 0, 'snap', reduced);
  }, [knob, value, reduced]);
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: knob.value * TRAVEL }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        tapFeedback();
        onChange(!value);
      }}
      style={{ minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 3 }}
    >
      <Text
        style={{
          flexShrink: 1,
          marginRight: 12,
          fontFamily: fonts.bodyStrong,
          fontSize: typeScale.body,
          color: disabled ? colors.ash : colors.paper,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          justifyContent: 'center',
          borderWidth: BORDER,
          borderColor: value ? colors.blood : colors.ash,
          backgroundColor: value ? colors.blood : colors.void,
          transform: [{ skewX: `${angles.row}deg` }],
        }}
      >
        <Animated.View
          style={[{ width: KNOB, height: KNOB, marginLeft: INSET, backgroundColor: value ? colors.paper : colors.ash }, knobStyle]}
        />
      </View>
    </Pressable>
  );
}
