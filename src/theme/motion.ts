import {
  FadeIn,
  FadeOut,
  useReducedMotion,
  withSpring,
  withTiming,
  type EntryAnimationsValues,
} from 'react-native-reanimated';
import { durations, springs } from './motion-tokens';

/**
 * `reduced` es true si Android tiene activado "reducir animaciones". Reanimated 4 ya respeta ese ajuste del
 * sistema (ReduceMotion.System) y vuelve instantáneas las animaciones; `reduced` solo nos deja usar un
 * fundido corto donde Reanimated aplicaría su valor por defecto.
 */
export function useMotionPreference(): { reduced: boolean } {
  return { reduced: useReducedMotion() };
}

/**
 * Anima hacia `target` con el token pedido, o con un fundido corto si el usuario redujo animaciones.
 * (Con ese ajuste Reanimated ya haría el cambio instantáneo; el fundido corto es nuestra rama explícita.)
 */
export function animateTo(target: number, kind: 'snap' | 'slam', reduced: boolean) {
  'worklet';
  return reduced ? withTiming(target, { duration: durations.reducedFade }) : withSpring(target, springs[kind]);
}

/** Entrada `slam`: llega en diagonal desde abajo-izquierda con rebote. */
export function slamIn(values: EntryAnimationsValues) {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateX: -values.targetWidth * 0.6 }, { translateY: 40 }],
    },
    animations: {
      opacity: withTiming(1, { duration: durations.tap }),
      transform: [{ translateX: withSpring(0, springs.slam) }, { translateY: withSpring(0, springs.slam) }],
    },
  };
}

/** Fundido de 120 ms para piezas que aparecen dentro de un panel (sin animar el layout). */
export const fadeInQuick = FadeIn.duration(durations.reducedFade);
export const fadeOutQuick = FadeOut.duration(durations.reducedFade);
export const fadeInReduced = fadeInQuick;

/** Fundido de entrada para movimiento cotidiano (fondos): `screen` normal, 120 ms si se redujeron animaciones. */
export function fadeInFor(reduced: boolean) {
  return FadeIn.duration(reduced ? durations.reducedFade : durations.screen);
}

/** Animación de entrada según la preferencia de movimiento. */
export function enteringFor(reduced: boolean) {
  return reduced ? fadeInReduced : slamIn;
}
