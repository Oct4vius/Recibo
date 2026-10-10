import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { tapFeedback } from '@/lib/haptics';
import { animateTo, useMotionPreference } from '@/theme/motion';
import { colors } from '@/theme/tokens';

interface Props {
  ratio: number;
  tone: 'ash' | 'blood' | 'paper';
  label: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * Barra recta (nunca inclinada: la altura es el dato). Área táctil = columna completa. Aparece ya dibujada; al cambiar
 * de valor se ajusta con `snap` (scaleY desde abajo, sin animar el layout).
 */
export function HistoryBar({ ratio, tone, label, selected, onPress }: Props) {
  const { reduced } = useMotionPreference();
  const scale = useSharedValue(ratio);
  useEffect(() => {
    scale.value = animateTo(ratio, 'snap', reduced);
  }, [scale, ratio, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={{ flex: 1, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 4 }}
    >
      <Animated.View style={[{ height: '100%', backgroundColor: colors[tone], transformOrigin: 'bottom' }, style]} />
    </Pressable>
  );
}
