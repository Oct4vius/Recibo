import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { phaseAfterEvent, phaseAfterLoad } from '@desktop/session/session-state';

const retryable = new AuthRetryableFetchError('Failed to fetch', 0);
const dead = new AuthApiError('Invalid Refresh Token', 400, 'refresh_token_not_found');
const session = { user: { id: 'u' } };

describe('phaseAfterLoad', () => {
  it('con sesión entra', () => expect(phaseAfterLoad('loading', { session, error: null })).toBe('signed-in'));
  it('sin sesión ni error es el inicio limpio', () => expect(phaseAfterLoad('loading', { session: null, error: null })).toBe('signed-out'));
  it('sin red queda offline', () => expect(phaseAfterLoad('loading', { session: null, error: retryable })).toBe('offline'));
  it('token rechazado es expired', () => expect(phaseAfterLoad('loading', { session: null, error: dead })).toBe('expired'));
  it('un fallo del almacén no deja la app cargando', () => expect(phaseAfterLoad('loading', { session: null, error: new Error('keyring') })).toBe('expired'));
  it('una carga tardía no pisa una sesión ya abierta', () => expect(phaseAfterLoad('signed-in', { session: null, error: retryable })).toBe('signed-in'));
  it('offline vuelve a entrar', () => expect(phaseAfterLoad('offline', { session, error: null })).toBe('signed-in'));
});

describe('phaseAfterEvent', () => {
  describe('regression — arranque sin internet mostraba el inicio de sesión', () => {
    it('INITIAL_SESSION nulo no cambia offline', () => expect(phaseAfterEvent('offline', 'INITIAL_SESSION', null, false)).toBe('offline'));
    it('INITIAL_SESSION nulo no cambia loading', () => expect(phaseAfterEvent('loading', 'INITIAL_SESSION', null, false)).toBe('loading'));
  });
  it('SIGNED_OUT por la usuaria es el inicio limpio', () => expect(phaseAfterEvent('signed-in', 'SIGNED_OUT', null, true)).toBe('signed-out'));
  it('SIGNED_OUT sin pedirlo es expired', () => expect(phaseAfterEvent('signed-in', 'SIGNED_OUT', null, false)).toBe('expired'));
  it('TOKEN_REFRESHED saca de offline', () => expect(phaseAfterEvent('offline', 'TOKEN_REFRESHED', session, false)).toBe('signed-in'));
});
