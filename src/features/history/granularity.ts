/** Granularidad del historial (parámetro `p_granularity` de `get_history`). */
export type Granularity = 'week' | 'month' | 'year';

export const GRANULARITIES: readonly Granularity[] = ['week', 'month', 'year'];

/** Vista del historial: una granularidad con barras, o todo el tiempo. */
export type HistoryView = Granularity | 'all';

export const HISTORY_VIEWS: readonly HistoryView[] = ['week', 'month', 'year', 'all'];

export const DEFAULT_VIEW: HistoryView = 'month';
