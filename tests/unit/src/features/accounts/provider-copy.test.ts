import { describe, expect, it } from 'vitest';
import { unlinkNote } from '@/features/accounts/provider-copy';

describe('unlinkNote', () => {
  it('tells where to remove the permission for each provider', () => {
    expect(unlinkNote('outlook')).toBe('Para quitar también el permiso en Microsoft: account.live.com/consent');
    expect(unlinkNote('gmail')).toBe('Recibo intenta quitar el permiso de tu Gmail; puedes confirmarlo en myaccount.google.com/permissions.');
  });
});
