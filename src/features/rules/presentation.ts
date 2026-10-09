import { CHECK_VIOLATION, postgresCode, UNIQUE_VIOLATION } from '@/lib/postgres-errors';
import { SAVE_ERROR } from '@/features/transactions/messages';

/** Valores del CHECK de `merchant_rules.match_field` (columna text, no enum). */
export type MatchField = 'merchant' | 'counterparty_last4';

export const MATCH_FIELD_LABELS: Record<MatchField, string> = { merchant: 'Comercio', counterparty_last4: 'Cuenta destino' };

/** Mismo límite que el CHECK de `merchant_rules.pattern`. */
export const MAX_RULE_PATTERN = 80;
const ACCOUNT_DIGITS = /^[0-9]{4}$/;
const ACCOUNT_ERROR = 'Escribe los últimos 4 dígitos de la cuenta.';

export function ruleTitle(pattern: string, categoryName: string): string {
  return `${pattern} → ${categoryName}`;
}

export function ruleSubtitle(matchField: MatchField): string {
  return matchField === 'merchant' ? 'Comercio contiene' : 'Cuenta destino termina en';
}

export function rulePatternError(matchField: MatchField, pattern: string): string | null {
  const trimmed = pattern.trim();
  if (matchField === 'counterparty_last4') return ACCOUNT_DIGITS.test(trimmed) ? null : ACCOUNT_ERROR;
  if (trimmed.length === 0) return 'Escribe el texto a buscar.';
  if (trimmed.length > MAX_RULE_PATTERN) return `Máximo ${MAX_RULE_PATTERN} caracteres.`;
  return null;
}

export function ruleErrorMessage(error: unknown): string {
  const code = postgresCode(error);
  if (code === UNIQUE_VIOLATION) return 'Ya tienes una regla con ese texto.';
  if (code === CHECK_VIOLATION) return ACCOUNT_ERROR;
  return SAVE_ERROR;
}

export function appliedRuleText(count: number): string {
  if (count === 0) return 'Regla guardada';
  return `Regla guardada · se aplicó a ${count} ${count === 1 ? 'movimiento' : 'movimientos'}`;
}
