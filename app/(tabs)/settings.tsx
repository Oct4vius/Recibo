import { Text } from 'react-native';
import { Screen } from '@/components/Screen';
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
      <SignOutButton />
    </Screen>
  );
}
