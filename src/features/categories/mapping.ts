import type { Tables } from '@/types/database';

/** Categoría visible: por defecto (`isOwn = false`, no editable) o propia. */
export interface Category {
  id: string;
  name: string;
  isOwn: boolean;
  countsAsSpending: boolean;
}

export function toCategory(row: Pick<Tables<'categories'>, 'id' | 'name' | 'user_id' | 'counts_as_spending'>): Category {
  return { id: row.id, name: row.name, isOwn: row.user_id !== null, countsAsSpending: row.counts_as_spending };
}
