import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SkewButton } from '@/components/SkewButton';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { useSession } from '@/features/auth/hooks';
import { colors, fonts, typeScale } from '@/theme/tokens';

export default function SettingsScreen() {
  const { session } = useSession();
  return (
    <Screen title="AJUSTES" backdrop={4}>
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginBottom: 20 }}>
        Sesión iniciada como {session?.user.email}
      </Text>
      {__DEV__ ? (
        <View style={{ marginBottom: 16 }}>
          <SkewButton label="Abrir galería" variant="ghost" onPress={() => router.push('/dev/gallery')} />
        </View>
      ) : null}
      <SignOutButton />
    </Screen>
  );
}
