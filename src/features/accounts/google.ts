// Lógica pura del login con Google. No importa el SDK: lo usa LinkGmailButton.
import { GMAIL_READONLY_SCOPE } from '../../../supabase/functions/_shared/mail/google-auth.ts';

export const GOOGLE_MESSAGES = {
  cancelled: 'Cancelaste el inicio de sesión con Google.',
  noCode: 'Google no entregó el código. Intenta de nuevo.',
  failed: 'Google no permitió vincular la cuenta. Intenta de nuevo.',
  playServices: 'Este teléfono necesita Google Play Services actualizado para vincular Gmail.',
} as const;

/**
 * Configuración del SDK. `forceCodeForRefreshToken` hace que Google entregue refresh token al servidor
 * aunque la cuenta ya haya dado su consentimiento antes (revincular).
 */
export function googleSignInConfig(webClientId: string): {
  webClientId: string;
  offlineAccess: true;
  forceCodeForRefreshToken: true;
  scopes: string[];
} {
  return { webClientId, offlineAccess: true, forceCodeForRefreshToken: true, scopes: [GMAIL_READONLY_SCOPE] };
}

export type GoogleLinkStep = { kind: 'code'; code: string } | { kind: 'message'; message: string };

/** De la respuesta de `signIn()` solo sale el `serverAuthCode`; nada más se lee ni se guarda. */
export function googleLinkStep(response: { type: string; data?: { serverAuthCode?: string | null } | null }): GoogleLinkStep {
  if (response.type === 'success') {
    const code = response.data?.serverAuthCode;
    return code ? { kind: 'code', code } : { kind: 'message', message: GOOGLE_MESSAGES.noCode };
  }
  return { kind: 'message', message: response.type === 'cancelled' ? GOOGLE_MESSAGES.cancelled : GOOGLE_MESSAGES.failed };
}
