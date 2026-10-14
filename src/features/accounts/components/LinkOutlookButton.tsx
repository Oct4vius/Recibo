import { Prompt, ResponseType, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';
import { SkewButton } from '@/components/SkewButton';
import { env } from '@/lib/env';
import { useLinkOutlook } from '../hooks';
import { MS_DISCOVERY, MS_REDIRECT_URI, MS_SCOPES } from '../microsoft';

WebBrowser.maybeCompleteAuthSession();

const AUTH_DENIED = 'Microsoft no permitió vincular la cuenta. Intenta de nuevo.';

/** Abre el login de Microsoft (PKCE) y entrega el código a link-account. */
export function LinkOutlookButton({ onMessage }: { onMessage: (message: string | null) => void }) {
  const link = useLinkOutlook();
  const handled = useRef<string | null>(null);
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

  useEffect(() => {
    if (!response || !request) return;
    if (response.type === 'error') {
      onMessage(AUTH_DENIED);
      return;
    }
    if (response.type !== 'success') return;
    const code = response.params.code;
    if (!code || !request.codeVerifier || handled.current === code) return;
    handled.current = code;
    link.mutate(
      { code, codeVerifier: request.codeVerifier, redirectUri: MS_REDIRECT_URI },
      { onError: (error) => onMessage(error.message) },
    );
  }, [response, request, link, onMessage]);

  return (
    <SkewButton
      label="Vincular Outlook"
      disabled={!request}
      loading={link.isPending}
      onPress={() => {
        onMessage(null);
        promptAsync();
      }}
    />
  );
}
