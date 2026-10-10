import { describe, expect, it } from 'vitest';
import { categoryErrorMessage, categoryNameError, deleteCategoryPrompt } from '@/features/categories/validation';
import { SAVE_ERROR } from '@/features/transactions/messages';

describe('categoryNameError', () => {
  it('requires a name of 1 to 40 characters after trimming', () => {
    expect(categoryNameError('   ')).toBe('Escribe un nombre.');
    expect(categoryNameError('a'.repeat(41))).toBe('Máximo 40 caracteres.');
    expect(categoryNameError(' Gym ')).toBeNull();
  });
});

describe('categoryErrorMessage', () => {
  it('explains a duplicate name and falls back to the save error', () => {
    expect(categoryErrorMessage({ code: '23505' })).toBe('Ya tienes una categoría con ese nombre.');
    expect(categoryErrorMessage(new Error('offline'))).toBe(SAVE_ERROR);
  });
});

describe('deleteCategoryPrompt', () => {
  it('says what happens to movements and rules', () => {
    expect(deleteCategoryPrompt('Gym', 2, true)).toEqual({
      title: '¿Borrar «Gym»?',
      message: 'Sus movimientos quedan sin categoría y se borran sus 2 reglas.',
    });
    expect(deleteCategoryPrompt('Gym', 1, true).message).toBe('Sus movimientos quedan sin categoría y se borra su regla.');
    expect(deleteCategoryPrompt('Gym', 0, true).message).toBe('Sus movimientos quedan sin categoría.');
  });
  it('warns that movements of a non-spending category count again', () => {
    expect(deleteCategoryPrompt('Ahorro', 0, false).message).toBe(
      'Sus movimientos quedan sin categoría. Esos movimientos vuelven a contar como gasto.',
    );
  });
});
