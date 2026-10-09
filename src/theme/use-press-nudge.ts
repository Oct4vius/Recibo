import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useMotionPreference } from './motion';
import { durations } from './motion-tokens';

/** Respuesta al toque de tiras, botones y bloques: `pressed` va de 0 a 1 en `tap` (sin movimiento si se redujeron animaciones). */
export function usePressNudge(): { pressed: SharedValue<number>; onPressIn: () => void; onPressOut: () => void } {
  const { reduced } = useMotionPreference();
  const pressed = useSharedValue(0);
  return {
    pressed,
    onPressIn: () => {
      if (!reduced) pressed.value = withTiming(1, { duration: durations.tap });
    },
    onPressOut: () => {
      pressed.value = withTiming(0, { duration: durations.tap });
    },
  };
}
