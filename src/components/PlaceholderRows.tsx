import { View } from 'react-native';
import { angles, colors, MIN_TOUCH } from '@/theme/tokens';

/** Tiras vacías con forma de fila mientras cargan los datos (sin spinners genéricos). */
export function PlaceholderRows({ count = 3 }: { count?: number }) {
  return (
    <View accessible accessibilityLabel="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{ height: MIN_TOUCH, marginVertical: 3, backgroundColor: colors.panel, transform: [{ skewX: `${angles.row}deg` }] }}
        />
      ))}
    </View>
  );
}
