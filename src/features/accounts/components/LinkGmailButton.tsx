import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { useState } from 'react';
import { SkewButton } from '@/components/SkewButton';
import { GOOGLE_MESSAGES, googleLinkStep, googleSignInConfig } from '../google';
import { useLinkAccount } from '../hooks';

/** Ignora el fallo de signOut: solo limpia la sesión local de Google, nunca revoca el permiso del servidor. */
async function signOutQuietly(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Sin sesión previa no hay nada que cerrar.
  }
}

/** Google Sign-In nativo: solo se lee el `serverAuthCode`, que link-account canjea en el servidor. */
export function LinkGmailButton({ webClientId, onMessage }: { webClientId: string; onMessage: (message: string | null) => void }) {
  const { mutate, isPending } = useLinkAccount();
  const [signingIn, setSigningIn] = useState(false);

  const start = async () => {
    onMessage(null);
    setSigningIn(true);
    try {
      GoogleSignin.configure(googleSignInConfig(webClientId));
      await GoogleSignin.hasPlayServices();
      await signOutQuietly(); // fuerza el selector de cuenta
      const step = googleLinkStep(await GoogleSignin.signIn());
      await signOutQuietly(); // no deja sesión de Google en el teléfono
      if (step.kind === 'message') {
        onMessage(step.message);
        return;
      }
      mutate({ provider: 'gmail', code: step.code }, { onError: (error) => onMessage(error.message) });
    } catch (error) {
      // No se muestra ni registra el error crudo del SDK.
      if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return;
      onMessage(isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE ? GOOGLE_MESSAGES.playServices : GOOGLE_MESSAGES.failed);
    } finally {
      setSigningIn(false);
    }
  };

  return <SkewButton label="Vincular Gmail" loading={signingIn || isPending} onPress={start} />;
}
