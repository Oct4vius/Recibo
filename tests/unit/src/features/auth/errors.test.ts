import { describe, expect, it } from 'vitest';
import { authErrorMessage } from '@/features/auth/errors';

describe('authErrorMessage', () => {
  it('returns null when there is no error', () => {
    expect(authErrorMessage(null)).toBeNull();
  });
  it('explains wrong credentials', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', status: 400 })).toBe('Correo o contraseña incorrectos.');
  });
  it('explains an unconfirmed account', () => {
    expect(authErrorMessage({ code: 'email_not_confirmed', status: 400 })).toBe(
      'Tu cuenta no está confirmada. Pídele al administrador que la confirme.',
    );
  });
  it('explains rate limiting', () => {
    expect(authErrorMessage({ code: 'over_request_rate_limit', status: 429 })).toBe(
      'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
    );
  });
  it('explains a network failure', () => {
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toBe(
      'Sin conexión. Revisa tu internet y vuelve a intentarlo.',
    );
  });
  it('falls back to a generic message without leaking the raw error', () => {
    expect(authErrorMessage({ code: 'unexpected_failure', status: 500 })).toBe(
      'No se pudo iniciar sesión. Vuelve a intentarlo.',
    );
  });
});
