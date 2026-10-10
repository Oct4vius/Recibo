import { supabase } from '@/lib/supabase';
import { toCategory, type Category } from './mapping';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('id, name, user_id, counts_as_spending').order('name');
  if (error) throw error;
  return data.map(toCategory);
}

export interface CategoryInput {
  /** Sin id crea una categoría propia. */
  id?: string;
  name: string;
  countsAsSpending: boolean;
}

export async function saveCategory(input: CategoryInput, userId: string): Promise<void> {
  const values = { name: input.name.trim(), counts_as_spending: input.countsAsSpending };
  const { error } = input.id
    ? await supabase.from('categories').update(values).eq('id', input.id)
    : await supabase.from('categories').insert({ ...values, user_id: userId });
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

/** Cuántas reglas apuntan a la categoría (se borran con ella). */
export async function countCategoryRules(categoryId: string): Promise<number> {
  const { count, error } = await supabase
    .from('merchant_rules')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId);
  if (error) throw error;
  return count ?? 0;
}

/** Categorías de los últimos 30 movimientos, del más reciente al más viejo (selección, no agregado). */
export async function fetchRecentCategoryIds(): Promise<(string | null)[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('category_id')
    .not('category_id', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data.map((row) => row.category_id);
}
