import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { tapFeedback } from '@/lib/haptics';
import { colors } from '@/theme/tokens';

const SIZE = 56;
/** Lado del cuadrado girado 45°: su diagonal (~56 dp) llena el área táctil. */
const DIAMOND = 40;

/** Botón flotante "+": rombo rojo abajo a la derecha que abre el panel de gasto. */
export function AddFab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Agregar gasto"
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={{ position: 'absolute', right: 20, bottom: 20, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: DIAMOND, height: DIAMOND, backgroundColor: colors.blood, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute' }}>
        <Ionicons name="add" size={28} color={colors.paper} />
      </View>
    </Pressable>
  );
}
