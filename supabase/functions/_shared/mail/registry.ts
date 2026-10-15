import { createGraphProvider } from './graph.ts';
import type { MailProvider } from './types.ts';

/** Proveedor por cuenta. Agregar Gmail (3b) es registrarlo aquí. */
export function providerFor(provider: 'gmail' | 'outlook', config: { msClientId: string }): MailProvider | null {
  if (provider === 'outlook') return createGraphProvider({ clientId: config.msClientId });
  return null;
}
