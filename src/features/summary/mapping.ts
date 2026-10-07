export interface SpendingSummary {
  totalDop: number;
  previousTotalDop: number;
  txCount: number;
}

export function toSpendingSummary(
  row: { total_dop: number; previous_total_dop: number; tx_count: number } | undefined,
): SpendingSummary {
  if (!row) return { totalDop: 0, previousTotalDop: 0, txCount: 0 };
  return { totalDop: row.total_dop, previousTotalDop: row.previous_total_dop, txCount: row.tx_count };
}
