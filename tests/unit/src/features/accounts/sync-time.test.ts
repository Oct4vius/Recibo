import { describe, expect, it } from 'vitest';
import { accountStatusText, syncedAgo } from '@/features/accounts/sync-time';
import type { LinkedAccount } from '@/features/accounts/mapping';

const now = new Date('2026-10-10T12:00:00Z');
const base: LinkedAccount = { id: 'a', provider: 'outlook', email: 'o@outlook.example', status: 'active', lastSyncAt: null, lastError: null };

describe('syncedAgo', () => {
  it('reads minutes, hours, yesterday and days', () => {
    expect(syncedAgo('2026-10-10T11:59:40Z', now)).toBe('hace un momento');
    expect(syncedAgo('2026-10-10T11:54:00Z', now)).toBe('hace 6 min');
    expect(syncedAgo('2026-10-10T10:00:00Z', now)).toBe('hace 2 h');
    expect(syncedAgo('2026-10-09T10:00:00Z', now)).toBe('ayer');
    expect(syncedAgo('2026-10-06T10:00:00Z', now)).toBe('hace 4 días');
  });
});

describe('accountStatusText', () => {
  it('describes each state', () => {
    expect(accountStatusText(base, now)).toBe('Esperando la primera sincronización');
    expect(accountStatusText({ ...base, lastSyncAt: '2026-10-10T11:54:00Z' }, now)).toBe('Activa · sincronizada hace 6 min');
    expect(accountStatusText({ ...base, status: 'error', lastError: 'La sesión de Outlook expiró. Vuelve a vincular.' }, now)).toBe(
      'Error · La sesión de Outlook expiró. Vuelve a vincular.',
    );
    expect(accountStatusText({ ...base, status: 'revoked' }, now)).toBe('Desvinculada');
  });
});
