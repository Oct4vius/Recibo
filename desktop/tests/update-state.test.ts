import { describe, expect, it } from 'vitest';
import { shouldCheckUpdate, UPDATE_CHECK_GAP_MS } from '../src/updates/update-state';

describe('shouldCheckUpdate', () => {
  it('revisa al abrir y luego cada 6 horas', () => {
    expect(shouldCheckUpdate(null, 0)).toBe(true);
    expect(shouldCheckUpdate(0, UPDATE_CHECK_GAP_MS - 1)).toBe(false);
    expect(shouldCheckUpdate(0, UPDATE_CHECK_GAP_MS)).toBe(true);
  });
});
