import { describe, expect, it } from 'vitest';
import { toLinkedAccount } from '@/features/accounts/mapping';

describe('toLinkedAccount', () => {
  it('maps the row without exposing anything else', () => {
    expect(
      toLinkedAccount({ id: 'a', provider: 'outlook', email: 'o@outlook.example', status: 'active', last_sync_at: '2026-10-10T11:54:00Z', last_error: null }),
    ).toEqual({ id: 'a', provider: 'outlook', email: 'o@outlook.example', status: 'active', lastSyncAt: '2026-10-10T11:54:00Z', lastError: null });
  });
});
