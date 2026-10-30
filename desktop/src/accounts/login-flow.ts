import type { LinkAccountInput } from '@/features/accounts/api';
import { createPkce, googleAuthorizeUrl, LOOPBACK_REDIRECT, microsoftAuthorizeUrl } from '@/features/accounts/loopback-login';

export interface LoginPort {
  newState(): string;
  listen(state: string): Promise<void>;
  openUrl(url: string): Promise<void>;
  waitCode(): Promise<string>;
  /** Cierra la escucha en curso; no falla si no hay ninguna. */
  cancel(): Promise<void>;
}

/** Escucha primero y abre el navegador después; si no abre, la escucha no se queda sin límite de tiempo. */
async function obtainCode(port: LoginPort, state: string, authorizeUrl: string): Promise<string> {
  await port.listen(state);
  try {
    await port.openUrl(authorizeUrl);
  } catch (error) {
    await port.cancel();
    throw error;
  }
  return port.waitCode();
}

export async function connectOutlook(port: LoginPort, clientId: string): Promise<LinkAccountInput> {
  const { verifier, challenge } = await createPkce();
  const state = port.newState();
  const code = await obtainCode(port, state, microsoftAuthorizeUrl(clientId, challenge, state));
  return { provider: 'outlook', code, codeVerifier: verifier, redirectUri: LOOPBACK_REDIRECT };
}

export async function connectGmail(port: LoginPort, clientId: string): Promise<LinkAccountInput> {
  const state = port.newState();
  const code = await obtainCode(port, state, googleAuthorizeUrl(clientId, state));
  return { provider: 'gmail', code, redirectUri: LOOPBACK_REDIRECT };
}

const LOGIN_MESSAGES: Record<string, string> = {
  'port-busy': 'No se pudo abrir la conexión con el navegador. Reinicia la computadora y vuelve a intentarlo.',
  timeout: 'Se acabó el tiempo. Vuelve a intentarlo.',
  denied: 'No se dio permiso para leer el correo. Vuelve a intentarlo.',
};
const LOGIN_FALLBACK = 'No se pudo conectar el correo. Vuelve a intentarlo.';

/** Mensaje para la persona; `null` cuando ella misma canceló. */
export function loginErrorMessage(error: unknown): string | null {
  if (error === 'cancelled') return null;
  return (typeof error === 'string' && LOGIN_MESSAGES[error]) || LOGIN_FALLBACK;
}
