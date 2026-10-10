import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enteringFor, useMotionPreference } from '@/theme/motion';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

/** Fecha de hoy como sello blanco girado -4° sobre el título; entra con `slam`, igual que el título. */
export function DayTag({ label }: { label: string }) {
  const { reduced } = useMotionPreference();
  return (
    // La entrada y la rotación van en capas separadas: la animación de entrada reemplaza el `transform` de su vista.
    <Animated.View entering={enteringFor(reduced)} style={{ alignSelf: 'flex-start', marginTop: 8, marginBottom: 4 }}>
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 2,
          backgroundColor: colors.paper,
          transform: [{ rotate: `${angles.title}deg` }],
        }}
      >
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: typeScale.displaySm,
            lineHeight: typeScale.displaySm * 1.2,
            color: colors.void,
          }}
        >
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}
