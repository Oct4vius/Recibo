import { describe, expect, it } from 'vitest';
import { passwordChangeError, passwordUpdate } from '@/features/auth/password';

const valid = { current: 'vieja-clave-1', next: 'nueva-clave-12', repeat: 'nueva-clave-12' };

describe('passwordChangeError', () => {
  it('accepts a valid change', () => {
    expect(passwordChangeError(valid)).toBeNull();
  });
  it('requires the current password', () => {
    expect(passwordChangeError({ ...valid, current: '' })).toBe('Escribe tu contraseña actual.');
  });
  it('requires at least 10 characters', () => {
    expect(passwordChangeError({ ...valid, next: 'corta', repeat: 'corta' })).toBe(
      'La nueva contraseña debe tener al menos 10 caracteres.',
    );
  });
  it('requires both new passwords to match', () => {
    expect(passwordChangeError({ ...valid, repeat: 'otra-clave-12' })).toBe('Las contraseñas no coinciden.');
  });
  it('requires a different password', () => {
    expect(passwordChangeError({ current: 'misma-clave-1', next: 'misma-clave-1', repeat: 'misma-clave-1' })).toBe(
      'La nueva contraseña debe ser distinta de la actual.',
    );
  });
});

describe('regression — passwordUpdate', () => {
  it('sends the current password so the Auth server can require it', () => {
    expect(passwordUpdate('vieja-clave-1', 'nueva-clave-12')).toEqual({ password: 'nueva-clave-12', current_password: 'vieja-clave-1' });
  });
});
