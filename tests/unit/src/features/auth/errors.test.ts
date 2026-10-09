import { describe, expect, it } from 'vitest';
import {
  authErrorMessage,
  currentPasswordErrorMessage,
  passwordUpdateErrorMessage,
} from '@/features/auth/errors';

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

describe('currentPasswordErrorMessage', () => {
  it('says the current password is wrong', () => {
    expect(currentPasswordErrorMessage({ code: 'invalid_credentials', status: 400 })).toBe('La contraseña actual no es correcta.');
  });
  it('reports being offline and falls back to a generic message', () => {
    expect(currentPasswordErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toBe(
      'Sin conexión. Revisa tu internet y vuelve a intentarlo.',
    );
    expect(currentPasswordErrorMessage({ code: 'unexpected_failure', status: 500 })).toBe(
      'No se pudo cambiar la contraseña. Vuelve a intentarlo.',
    );
    expect(currentPasswordErrorMessage(null)).toBeNull();
  });
});

describe('passwordUpdateErrorMessage', () => {
  it('explains same and weak passwords', () => {
    expect(passwordUpdateErrorMessage({ code: 'same_password', status: 422 })).toBe(
      'La nueva contraseña debe ser distinta de la actual.',
    );
    expect(passwordUpdateErrorMessage({ code: 'weak_password', status: 422 })).toBe(
      'La nueva contraseña debe tener al menos 10 caracteres.',
    );
    expect(passwordUpdateErrorMessage(null)).toBeNull();
  });
});
