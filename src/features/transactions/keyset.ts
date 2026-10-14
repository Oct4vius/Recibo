/** Posición de la última fila vista. Orden de la lista: occurred_at desc, id desc. */
export interface PageCursor {
  occurredAt: string;
  id: string;
}

/**
 * Filtro `.or()` para pedir lo que sigue a `cursor`. Paginar por (occurred_at, id) en vez de offset evita
 * duplicados y saltos cuando el sync inserta movimientos mientras el usuario baja.
 */
export function keysetFilter(cursor: PageCursor): string {
  const at = `"${cursor.occurredAt}"`;
  return `occurred_at.lt.${at},and(occurred_at.eq.${at},id.lt.${cursor.id})`;
}

export function nextPageCursor(items: readonly { occurredAt: string; id: string }[], pageSize: number): PageCursor | null {
  if (items.length < pageSize) return null;
  const last = items[items.length - 1];
  return { occurredAt: last.occurredAt, id: last.id };
}
