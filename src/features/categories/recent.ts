export interface CategoryOption {
  id: string;
  name: string;
}

/** Categorías usadas más recientemente (sin repetir); si faltan, completa con las primeras de `all`. */
export function pickRecentCategories(
  recentIds: readonly (string | null)[],
  all: readonly CategoryOption[],
  count = 3,
): CategoryOption[] {
  const byId = new Map(all.map((category) => [category.id, category]));
  const picked: CategoryOption[] = [];
  for (const id of recentIds) {
    if (picked.length === count) return picked;
    const category = id ? byId.get(id) : undefined;
    if (category && !picked.includes(category)) picked.push(category);
  }
  for (const category of all) {
    if (picked.length === count) break;
    if (!picked.includes(category)) picked.push(category);
  }
  return picked;
}
