import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SkewButton } from '@/components/SkewButton';
import { TextField } from '@/components/TextField';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { signIn } from '../api';

/** Login con correo y contraseña. No hay registro ni recuperación por correo (CLAUDE.md). */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useMutation({ mutationFn: () => signIn(email, password) });
  const error = login.data ?? null;
  return (
    <View>
      <TextField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={() => login.mutate()}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.signal, marginBottom: 12 }}
        >
          {error}
        </Text>
      ) : null}
      <SkewButton label="Entrar" onPress={() => login.mutate()} loading={login.isPending} />
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.caption, color: colors.ash, marginTop: 20 }}>
        Si olvidaste tu contraseña, pídele al administrador que la restablezca.
      </Text>
    </View>
  );
}
