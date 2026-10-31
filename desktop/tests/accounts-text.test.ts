import { describe, expect, it } from 'vitest';
import type { LinkedAccount } from '@/features/accounts/mapping';
import { accountHelpLine, accountStatusLine, visibleAccounts } from '@desktop/accounts/accounts-text';

function account(over: Partial<LinkedAccount>): LinkedAccount {
  return { id: 'a', provider: 'gmail', email: 'a@x.com', status: 'active', lastSyncAt: null, lastError: null, ...over };
}

describe('accounts text', () => {
  it('estado en palabras', () => {
    expect(accountStatusLine(account({ status: 'active' }))).toBe('Funcionando');
    expect(accountStatusLine(account({ status: 'active', lastError: 'x' }))).toBe('Funcionando');
    expect(accountStatusLine(account({ status: 'error' }))).toBe('Dejó de funcionar');
    expect(accountStatusLine(account({ status: 'paused' }))).toBe('En pausa');
    expect(accountHelpLine(account({ status: 'error' }))).toBe('Este correo dejó de conectarse. Pide ayuda para volver a conectarlo.');
    expect(accountHelpLine(account({ status: 'active' }))).toBeNull();
  });
  it('los desconectados no se muestran', () =>
    expect(visibleAccounts([account({ status: 'revoked' }), account({ status: 'active' })])).toHaveLength(1));
});
