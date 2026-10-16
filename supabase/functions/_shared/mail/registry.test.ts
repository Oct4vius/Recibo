import { assertEquals, assertMatch } from 'jsr:@std/assert@1';
import { Constants } from '../database.types.ts';
import { providerFor } from './registry.ts';

const config = { msClientId: 'ms', googleClientId: 'g', googleClientSecret: 's' };

Deno.test('providerFor — every mail_provider value has a provider and a relink message', () => {
  for (const name of Constants.public.Enums.mail_provider) {
    const registered = providerFor(name, config);
    assertEquals(typeof registered.provider.fetchNew, 'function');
    assertEquals(typeof registered.provider.refreshToken, 'function');
    assertMatch(registered.expiredSession, /^La sesión de (Outlook|Gmail) expiró\. Vuelve a vincular\.$/);
  }
  assertEquals(providerFor('gmail', config).expiredSession, 'La sesión de Gmail expiró. Vuelve a vincular.');
  assertEquals(providerFor('outlook', config).expiredSession, 'La sesión de Outlook expiró. Vuelve a vincular.');
});
