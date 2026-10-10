import { useState } from 'react';
import { Text, View } from 'react-native';
import { SectionHeader } from '@/components/SectionHeader';
import { SkewRow } from '@/components/SkewRow';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { useSession } from '@/features/auth/hooks';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { ChangePasswordSheet } from './ChangePasswordSheet';

/** Correo, cambio de contraseña y cierre de sesión. */
export function AccountSection() {
  const { session } = useSession();
  const email = session?.user.email ?? '';
  const [open, setOpen] = useState(false);
  const [changed, setChanged] = useState(false);
  return (
    <View>
      <SectionHeader title="CUENTA" />
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginBottom: 8 }}>
        Sesión iniciada como {email}
      </Text>
      <SkewRow
        title="Cambiar contraseña"
        onPress={() => {
          setChanged(false);
          setOpen(true);
        }}
      />
      {changed ? (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper, marginTop: 6 }}>
          Contraseña actualizada
        </Text>
      ) : null}
      <View style={{ marginTop: 12 }}>
        <SignOutButton />
      </View>
      <ChangePasswordSheet
        visible={open}
        email={email}
        onClose={(done) => {
          setOpen(false);
          if (done) setChanged(true);
        }}
      />
    </View>
  );
}
