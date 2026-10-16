import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SkewButton } from '@/components/SkewButton';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { useUnlinkAccount } from '../hooks';
import type { LinkedAccount } from '../mapping';
import { unlinkNote } from '../provider-copy';

/** Desvincular una cuenta (con confirmación). Los movimientos importados se quedan. */
export function AccountForm({ account, onDone }: { account: LinkedAccount; onDone: () => void }) {
  const unlink = useUnlinkAccount();
  const [error, setError] = useState<string | null>(null);
  const confirm = () =>
    Alert.alert(`¿Desvincular ${account.email}?`, 'Los movimientos ya importados se quedan.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desvincular',
        style: 'destructive',
        onPress: () => {
          setError(null);
          unlink.mutate(account.id, { onSuccess: onDone, onError: (e) => setError(e.message) });
        },
      },
    ]);
  return (
    <View>
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginBottom: 16 }}>{unlinkNote(account.provider)}</Text>
      <SkewButton label="Desvincular" variant="ghost" loading={unlink.isPending} onPress={confirm} />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
