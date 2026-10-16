import { createGmailProvider } from './gmail.ts';
import { createGraphProvider } from './graph.ts';
import type { MailProvider, MailProviderName } from './types.ts';

export interface ProviderConfig {
  msClientId: string;
  /** Sin ambos, Gmail no está configurado y Outlook sigue funcionando. */
  googleClientId?: string;
  googleClientSecret?: string;
}

export interface RegisteredProvider {
  provider: MailProvider;
  /** Texto que ve el usuario cuando el proveedor rechaza la sesión. */
  expiredSession: string;
}

/** Proveedor por cuenta. Agregar uno es registrarlo aquí (el tipo exige una entrada por valor de `mail_provider`). */
const registry: Record<MailProviderName, (config: ProviderConfig) => RegisteredProvider | null> = {
  outlook: (config) => ({
    provider: createGraphProvider({ clientId: config.msClientId }),
    expiredSession: 'La sesión de Outlook expiró. Vuelve a vincular.',
  }),
  gmail: ({ googleClientId, googleClientSecret }) =>
    googleClientId?.trim() && googleClientSecret?.trim()
      ? {
        provider: createGmailProvider({ clientId: googleClientId, clientSecret: googleClientSecret }),
        expiredSession: 'La sesión de Gmail expiró. Vuelve a vincular.',
      }
      : null,
};

/** null = proveedor sin configurar en este entorno. */
export function providerFor(name: MailProviderName, config: ProviderConfig): RegisteredProvider | null {
  return registry[name](config);
}
