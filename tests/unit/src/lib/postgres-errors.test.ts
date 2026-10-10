import { describe, expect, it } from 'vitest';
import { postgresCode } from '@/lib/postgres-errors';

describe('postgresCode', () => {
  it('reads the SQLSTATE of a PostgREST error', () => {
    expect(postgresCode({ code: '23505', message: 'duplicate key' })).toBe('23505');
  });
  it('returns null for anything else', () => {
    expect(postgresCode(new Error('offline'))).toBeNull();
    expect(postgresCode(null)).toBeNull();
    expect(postgresCode({ code: 23505 })).toBeNull();
  });
});
