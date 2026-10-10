export interface SpendingSummary {
  totalDop: number;
  previousTotalDop: number;
  txCount: number;
  /** `YYYY-MM-DD` en la zona del perfil; `periodEnd` es exclusivo. null si la RPC no devolvió fila. */
  periodStart: string | null;
  periodEnd: string | null;
}

export function toSpendingSummary(
  row:
    | { total_dop: number; previous_total_dop: number; tx_count: number; period_start: string; period_end: string }
    | undefined,
): SpendingSummary {
  if (!row) return { totalDop: 0, previousTotalDop: 0, txCount: 0, periodStart: null, periodEnd: null };
  return {
    totalDop: row.total_dop,
    previousTotalDop: row.previous_total_dop,
    txCount: row.tx_count,
    periodStart: row.period_start,
    periodEnd: row.period_end,
  };
}
