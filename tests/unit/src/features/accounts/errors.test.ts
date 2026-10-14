import { describe, expect, it } from 'vitest';
import { functionErrorMessage, GENERIC_FUNCTION_ERROR } from '@/features/accounts/errors';

describe('functionErrorMessage', () => {
  it('uses the Spanish message returned by the Edge Function', async () => {
    const error = { context: new Response(JSON.stringify({ error: 'Cuenta no encontrada' }), { status: 404 }) };
    expect(await functionErrorMessage(error)).toBe('Cuenta no encontrada');
  });
  it('falls back to a generic message', async () => {
    expect(await functionErrorMessage(new Error('Failed to fetch'))).toBe(GENERIC_FUNCTION_ERROR);
    expect(await functionErrorMessage({ context: new Response('not json', { status: 500 }) })).toBe(GENERIC_FUNCTION_ERROR);
  });
});
