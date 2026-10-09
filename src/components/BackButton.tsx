import { router } from 'expo-router';
import { View } from 'react-native';
import { SkewButton } from './SkewButton';

/** "Atrás" para subpantallas (además del botón Atrás de Android). */
export function BackButton() {
  return (
    <View style={{ alignSelf: 'flex-start', marginTop: 8 }}>
      <SkewButton label="Atrás" variant="ghost" onPress={() => router.back()} />
    </View>
  );
}
