import { Prompt, ResponseType, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';
import { SkewButton } from '@/components/SkewButton';
import { env } from '@/lib/env';
import { useLinkAccount } from '../hooks';
import { MS_DISCOVERY, MS_REDIRECT_URI, MS_SCOPES } from '../microsoft';

WebBrowser.maybeCompleteAuthSession();

const AUTH_DENIED = 'Microsoft no permitió vincular la cuenta. Intenta de nuevo.';

/** Abre el login de Microsoft (PKCE) y entrega el código a link-account. */
export function LinkOutlookButton({ onMessage }: { onMessage: (message: string | null) => void }) {
  // `mutate` es estable; el objeto de la mutación cambia en cada render y re-dispararía el efecto.
  const { mutate, isPending } = useLinkAccount();
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: env.EXPO_PUBLIC_MS_CLIENT_ID,
      scopes: MS_SCOPES,
      redirectUri: MS_REDIRECT_URI,
      responseType: ResponseType.Code,
      usePKCE: true,
      prompt: Prompt.SelectAccount,
    },
    MS_DISCOVERY,
  );
  // Cada respuesta del login se atiende una sola vez (error o éxito), aunque el efecto vuelva a correr.
  const handled = useRef<typeof response>(null);

  useEffect(() => {
    if (!response || !request || handled.current === response) return;
    handled.current = response;
    if (response.type === 'error') {
      onMessage(AUTH_DENIED);
      return;
    }
    if (response.type !== 'success') return;
    const code = response.params.code;
    if (!code || !request.codeVerifier) return;
    mutate(
      { provider: 'outlook', code, codeVerifier: request.codeVerifier, redirectUri: MS_REDIRECT_URI },
      { onError: (error) => onMessage(error.message) },
    );
  }, [response, request, mutate, onMessage]);

  return (
    <SkewButton
      label="Vincular Outlook"
      disabled={!request}
      loading={isPending}
      onPress={() => {
        onMessage(null);
        promptAsync();
      }}
    />
  );
}
