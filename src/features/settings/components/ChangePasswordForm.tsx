import { useState } from 'react';
import { Text, View } from 'react-native';
import { SkewButton } from '@/components/SkewButton';
import { TextField } from '@/components/TextField';
import { useChangePassword } from '@/features/auth/hooks';
import { passwordChangeError } from '@/features/auth/password';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { colors, fonts, typeScale } from '@/theme/tokens';

/** Contraseña actual, nueva y repetida. La actual se verifica antes de guardar la nueva. */
export function ChangePasswordForm({ email, onDone }: { email: string; onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const change = useChangePassword(email);
  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setError(null);
  };
  const submit = () => {
    const invalid = passwordChangeError({ current, next, repeat });
    if (invalid) {
      setError(invalid);
      return;
    }
    change.mutate(
      { current, next },
      { onSuccess: (message) => (message ? setError(message) : onDone()), onError: () => setError(SAVE_ERROR) },
    );
  };
  return (
    <View>
      <TextField label="Contraseña actual" value={current} onChangeText={edit(setCurrent)} secureTextEntry autoComplete="current-password" />
      <TextField label="Nueva contraseña" value={next} onChangeText={edit(setNext)} secureTextEntry autoComplete="new-password" />
      <TextField label="Repite la nueva contraseña" value={repeat} onChangeText={edit(setRepeat)} secureTextEntry autoComplete="new-password" />
      <SkewButton label="Guardar" onPress={submit} loading={change.isPending} />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
