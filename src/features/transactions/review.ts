import type { TransactionListItem } from './mapping';

/** Reversa sin compra emparejada que el usuario todavía no revisó (aparece en "Revisar"). */
export function needsReview(item: TransactionListItem): boolean {
  return item.type === 'card_reversal' && item.ignoredReason === 'unmatched_reversal' && item.reviewedAt === null;
}

/** Las reversas nunca cuentan: no tienen "Ignorar/Contar este gasto". */
export function canToggleIgnored(item: TransactionListItem): boolean {
  return item.type !== 'card_reversal';
}
