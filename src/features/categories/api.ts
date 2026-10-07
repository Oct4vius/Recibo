import { supabase } from '@/lib/supabase';
import type { CategoryOption } from './recent';

export async function fetchCategories(): Promise<CategoryOption[]> {
  const { data, error } = await supabase.from('categories').select('id, name').order('name');
  if (error) throw error;
  return data;
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
