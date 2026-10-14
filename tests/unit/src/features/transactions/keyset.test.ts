import { describe, expect, it } from 'vitest';
import { keysetFilter, nextPageCursor } from '@/features/transactions/keyset';

describe('keysetFilter', () => {
  it('asks for rows strictly before the last one, breaking ties by id (values quoted for PostgREST)', () => {
    expect(keysetFilter({ occurredAt: '2026-10-05T14:00:00+00:00', id: 'b0000000-0000-0000-0000-000000000002' })).toBe(
      'occurred_at.lt."2026-10-05T14:00:00+00:00",and(occurred_at.eq."2026-10-05T14:00:00+00:00",id.lt.b0000000-0000-0000-0000-000000000002)',
    );
  });
});

describe('nextPageCursor', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ occurredAt: '2026-10-05T14:00:00+00:00', id: `id-${i}` }));
  it('continues from the last row of a full page, even when timestamps tie', () => {
    expect(nextPageCursor(rows(3), 3)).toEqual({ occurredAt: '2026-10-05T14:00:00+00:00', id: 'id-2' });
  });
  it('stops after a short page', () => {
    expect(nextPageCursor(rows(2), 3)).toBeNull();
  });
});
