import { parseIsoDate, type LocalDate } from '@/lib/dates';

export interface HistoryBucket {
  start: LocalDate;
  /** `YYYY-MM-DD`: identifica la barra y su fila. */
  startIso: string;
  totalDop: number;
  txCount: number;
}

export function toHistoryBucket(row: { bucket_start: string; total_dop: number; tx_count: number }): HistoryBucket {
  return { start: parseIsoDate(row.bucket_start), startIso: row.bucket_start, totalDop: row.total_dop, txCount: row.tx_count };
}
