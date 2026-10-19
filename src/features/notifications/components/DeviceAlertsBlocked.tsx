import { Text, View } from 'react-native';
import { SkewButton } from '@/components/SkewButton';
import { colors, fonts, typeScale } from '@/theme/tokens';

/** Android negó el permiso: explica por qué el interruptor está apagado y lleva a la configuración. */
export function DeviceAlertsBlocked({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal }}>
        Avisos bloqueados en el teléfono
      </Text>
      <SkewButton label="Abrir configuración de Android" variant="ghost" onPress={onOpenSettings} />
    </View>
  );
}
