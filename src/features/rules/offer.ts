import { MAX_RULE_PATTERN, type MatchField } from './presentation';

export interface RuleOffer {
  matchField: MatchField;
  /** Texto propuesto (el usuario puede recortarlo si es por comercio). */
  pattern: string;
}

export interface OfferInput {
  merchant: string;
  counterpartyLast4: string | null;
  categoryId: string | null;
  /** Categoría antes de editar (null en un gasto nuevo). */
  originalCategoryId: string | null;
}

/** Qué regla ofrecer al guardar un gasto, o null. La cuenta destino manda sobre el comercio (transferencias propias). */
export function ruleOffer({ merchant, counterpartyLast4, categoryId, originalCategoryId }: OfferInput): RuleOffer | null {
  if (categoryId === null || categoryId === originalCategoryId) return null;
  if (counterpartyLast4) return { matchField: 'counterparty_last4', pattern: counterpartyLast4 };
  const trimmed = merchant.trim();
  return trimmed ? { matchField: 'merchant', pattern: trimmed.slice(0, MAX_RULE_PATTERN) } : null;
}

export function ruleOfferLabel(offer: RuleOffer, pattern: string, categoryName: string): string {
  return offer.matchField === 'counterparty_last4'
    ? `Siempre poner la cuenta …${offer.pattern} en ${categoryName}`
    : `Siempre poner «${pattern.trim()}» en ${categoryName}`;
}

export function ruleNotice(appliedCount: number): string {
  if (appliedCount === 0) return 'Gasto guardado · regla guardada.';
  return `Gasto guardado · la regla se aplicó a ${appliedCount} ${appliedCount === 1 ? 'movimiento' : 'movimientos'} más.`;
}

export const RULE_SAVE_FAILED = 'Se guardó el gasto, pero no la regla. Intenta desde Ajustes → Reglas.';
