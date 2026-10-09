import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enteringFor, useMotionPreference } from '@/theme/motion';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

/** Fecha de hoy en una etiqueta blanca inclinada, sobre el título; entra de golpe como los títulos. */
export function DayTag({ label }: { label: string }) {
  const { reduced } = useMotionPreference();
  return (
    <Animated.View entering={enteringFor(reduced)} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
      {/* La inclinación va en un View interior: el `entering` de Reanimated reemplaza el transform. */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 2,
          backgroundColor: colors.paper,
          transform: [{ skewX: `${angles.row}deg` }],
        }}
      >
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: typeScale.displaySm,
            color: colors.void,
            transform: [{ skewX: `${-angles.row}deg` }],
          }}
        >
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}
