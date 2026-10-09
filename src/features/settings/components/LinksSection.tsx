import { router } from 'expo-router';
import { View } from 'react-native';
import { SectionHeader } from '@/components/SectionHeader';
import { SkewButton } from '@/components/SkewButton';
import { SkewRow } from '@/components/SkewRow';

/** Categorías, reglas, cuentas vinculadas (próximamente) y, en desarrollo, la galería. */
export function LinksSection() {
  return (
    <View>
      <SectionHeader title="ORGANIZAR" />
      <SkewRow title="Categorías" onPress={() => router.push('/categories')} />
      <SkewRow title="Reglas" onPress={() => router.push('/rules')} />
      <SectionHeader title="CUENTAS VINCULADAS" />
      <SkewRow title="Gmail y Outlook" subtitle="Próximamente" muted />
      {__DEV__ ? (
        <View style={{ marginTop: 16 }}>
          <SkewButton label="Abrir galería" variant="ghost" onPress={() => router.push('/dev/gallery')} />
        </View>
      ) : null}
    </View>
  );
}
