import * as Haptics from 'expo-haptics';

/** Vibración leve al tocar. Si el dispositivo no la soporta, no pasa nada. */
export function tapFeedback(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
