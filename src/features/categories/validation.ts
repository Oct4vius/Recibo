import { postgresCode, UNIQUE_VIOLATION } from '@/lib/postgres-errors';
import { SAVE_ERROR } from '@/features/transactions/messages';

/** Mismo límite que el CHECK de `categories.name`. */
export const MAX_CATEGORY_NAME = 40;

export function categoryNameError(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Escribe un nombre.';
  if (trimmed.length > MAX_CATEGORY_NAME) return `Máximo ${MAX_CATEGORY_NAME} caracteres.`;
  return null;
}

export function categoryErrorMessage(error: unknown): string {
  return postgresCode(error) === UNIQUE_VIOLATION ? 'Ya tienes una categoría con ese nombre.' : SAVE_ERROR;
}

/** Confirmación de borrado: qué pasa con sus movimientos y sus reglas (`merchant_rules` se borra en cascada). */
export function deleteCategoryPrompt(name: string, ruleCount: number, countsAsSpending: boolean): { title: string; message: string } {
  const rules = ruleCount === 0 ? '' : ruleCount === 1 ? ' y se borra su regla' : ` y se borran sus ${ruleCount} reglas`;
  const spending = countsAsSpending ? '' : ' Esos movimientos vuelven a contar como gasto.';
  return { title: `¿Borrar «${name}»?`, message: `Sus movimientos quedan sin categoría${rules}.${spending}` };
}
