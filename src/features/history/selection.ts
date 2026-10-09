/** Barra elegida y la ventana de datos sobre la que se eligió. */
export interface HistorySelection {
  windowKey: string;
  startIso: string;
}

/** Identidad de los datos mostrados: granularidad + inicio del primer período. */
export function windowKeyOf(granularity: string, firstStartIso: string | undefined): string {
  return `${granularity}:${firstStartIso ?? ''}`;
}

/** La barra elegida solo vale para los datos sobre los que se eligió; si cambiaron, no hay selección. */
export function selectedStartFor(selection: HistorySelection | null, windowKey: string): string | null {
  return selection !== null && selection.windowKey === windowKey ? selection.startIso : null;
}
