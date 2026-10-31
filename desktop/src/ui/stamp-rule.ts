/** El sello aparece al guardar un gasto, con o sin regla; los demás avisos no lo llevan. */
export function showsStamp(notice: string | null): boolean {
  return notice?.startsWith('Gasto guardado') ?? false;
}
