import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { fadeInFor, fadeOutQuick, useMotionPreference } from '@/theme/motion';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

/**
 * Aviso breve tras una acción (p. ej. "Gasto guardado · la regla se aplicó a 4 movimientos más."): tira inclinada abajo
 * a la izquierda, sin tapar el "+". Entra con fundido y sale más rápido. No recibe toques.
 */
export function NoticeBar({ text }: { text: string | null }) {
  const { reduced } = useMotionPreference();
  if (!text) return null;
  return (
    <Animated.View
      entering={fadeInFor(reduced)}
      exiting={fadeOutQuick}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 92, bottom: 24 }}
    >
      <View
        style={{
          backgroundColor: colors.panel,
          borderLeftWidth: 4,
          borderLeftColor: colors.blood,
          paddingHorizontal: 14,
          paddingVertical: 10,
          transform: [{ skewX: `${angles.row}deg` }],
        }}
      >
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper, transform: [{ skewX: `${-angles.row}deg` }] }}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}
