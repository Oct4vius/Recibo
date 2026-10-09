/** Granularidad del historial (parámetro `p_granularity` de `get_history`). */
export type Granularity = 'week' | 'month' | 'year';

export const GRANULARITIES: readonly Granularity[] = ['week', 'month', 'year'];
