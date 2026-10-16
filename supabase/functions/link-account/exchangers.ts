import { exchangeGoogleCode } from '../_shared/mail/google-auth.ts';
import { exchangeCode } from '../_shared/mail/microsoft-auth.ts';
import type { CodeExchanger, LinkMessages } from './handler.ts';

export const OUTLOOK_MESSAGES: LinkMessages = {
  codeExpired: 'El código de Microsoft venció o ya se usó. Vuelve a intentarlo.',
  noRefreshToken: 'Microsoft no dio acceso permanente a Recibo. Vuelve a vincular.',
  missingScope: 'Microsoft no dio permiso para leer el correo. Vuelve a vincular y acepta los permisos.',
};

export const GMAIL_MESSAGES: LinkMessages = {
  codeExpired: 'El código de Google venció o ya se usó. Vuelve a intentarlo.',
  noRefreshToken:
    'Google no dio acceso permanente a Recibo. Quita su acceso en myaccount.google.com/permissions y vuelve a vincular.',
  missingScope: 'Hay que permitir que Recibo lea tu Gmail. Vuelve a vincular y marca la casilla de Gmail.',
};

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/** Outlook: código PKCE de la app; exige code, codeVerifier y redirectUri. */
export function outlookExchanger(clientId: string, fetchImpl: typeof fetch = fetch): CodeExchanger {
  return {
    messages: OUTLOOK_MESSAGES,
    prepare: ({ code, codeVerifier, redirectUri }) =>
      nonEmpty(code) && nonEmpty(codeVerifier) && nonEmpty(redirectUri)
        ? () => exchangeCode({ clientId, code, codeVerifier, redirectUri }, fetchImpl)
        : null,
  };
}

/** Gmail: `serverAuthCode` del SDK (redirect_uri vacío) o código del script de terminal (con su redirectUri). */
export function gmailExchanger(config: { clientId: string; clientSecret: string }, fetchImpl: typeof fetch = fetch): CodeExchanger {
  return {
    messages: GMAIL_MESSAGES,
    prepare: ({ code, redirectUri }) => {
      if (!nonEmpty(code)) return null;
      if (redirectUri !== undefined && typeof redirectUri !== 'string') return null;
      return () => exchangeGoogleCode({ ...config, code, redirectUri: redirectUri ?? '' }, fetchImpl);
    },
  };
}
