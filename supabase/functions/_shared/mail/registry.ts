import { createGmailProvider } from './gmail.ts';
import { createGraphProvider } from './graph.ts';
import type { MailProvider, MailProviderName } from './types.ts';

export interface ProviderConfig {
  msClientId: string;
  googleClientId: string;
  googleClientSecret: string;
}

export interface RegisteredProvider {
  provider: MailProvider;
  /** Texto que ve el usuario cuando el proveedor rechaza la sesión. */
  expiredSession: string;
}

/** Proveedor por cuenta. Agregar uno es registrarlo aquí (el tipo exige una entrada por valor de `mail_provider`). */
const registry: Record<MailProviderName, (config: ProviderConfig) => RegisteredProvider> = {
  outlook: (config) => ({
    provider: createGraphProvider({ clientId: config.msClientId }),
    expiredSession: 'La sesión de Outlook expiró. Vuelve a vincular.',
  }),
  gmail: (config) => ({
    provider: createGmailProvider({ clientId: config.googleClientId, clientSecret: config.googleClientSecret }),
    expiredSession: 'La sesión de Gmail expiró. Vuelve a vincular.',
  }),
};

export function providerFor(name: MailProviderName, config: ProviderConfig): RegisteredProvider {
  return registry[name](config);
}
