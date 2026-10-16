import { describe, expect, it } from 'vitest';
import { unlinkNote } from '@/features/accounts/provider-copy';

describe('unlinkNote', () => {
  it('tells where to remove the permission for each provider', () => {
    expect(unlinkNote('outlook')).toBe('Para quitar también el permiso en Microsoft: account.live.com/consent');
    expect(unlinkNote('gmail')).toBe('Al desvincular, Recibo también pierde el permiso en tu cuenta de Google.');
  });
});
