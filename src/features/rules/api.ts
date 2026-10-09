import { supabase } from '@/lib/supabase';
import { toRule, type Rule, type RuleRow } from './mapping';
import type { MatchField } from './presentation';

export async function fetchRules(): Promise<Rule[]> {
  const { data, error } = await supabase
    .from('merchant_rules')
    .select('id, pattern, match_field, category_id, categories(name)')
    .order('created_at');
  if (error) throw error;
  return (data as RuleRow[]).map(toRule);
}

export interface RuleInput {
  /** Sin id crea (o actualiza la del mismo texto); con id edita esa regla. */
  id?: string;
  matchField: MatchField;
  pattern: string;
  categoryId: string;
}

/** Guarda la regla y la aplica en SQL a los movimientos sin categoría (`save_merchant_rule`). */
export async function saveRule(input: RuleInput): Promise<{ ruleId: string; appliedCount: number }> {
  const { data, error } = await supabase.rpc('save_merchant_rule', {
    p_match_field: input.matchField,
    p_pattern: input.pattern.trim(),
    p_category_id: input.categoryId,
    ...(input.id ? { p_rule_id: input.id } : {}),
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('save_merchant_rule returned no row');
  return { ruleId: row.rule_id, appliedCount: row.applied_count };
}

export async function deleteRule(id: string): Promise<void> {
  const { error } = await supabase.from('merchant_rules').delete().eq('id', id);
  if (error) throw error;
}
