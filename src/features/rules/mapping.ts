import type { Tables } from '@/types/database';
import type { MatchField } from './presentation';

export interface Rule {
  id: string;
  pattern: string;
  matchField: MatchField;
  categoryId: string;
  categoryName: string;
}

export type RuleRow = Pick<Tables<'merchant_rules'>, 'id' | 'pattern' | 'match_field' | 'category_id'> & {
  categories: { name: string } | null;
};

export function toRule(row: RuleRow): Rule {
  return {
    id: row.id,
    pattern: row.pattern,
    matchField: row.match_field === 'counterparty_last4' ? 'counterparty_last4' : 'merchant',
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? '',
  };
}
