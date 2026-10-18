import { ALERT_THRESHOLDS, type AlertThreshold } from '@/features/profile/alerts';
import type { BudgetPeriod } from '@/types/database';

/** Un umbral que el servidor reclamó en esta llamada y que hay que mostrar. */
export interface ClaimedAlert {
  period: BudgetPeriod;
  threshold: AlertThreshold;
}

function isKnownThreshold(value: number): value is AlertThreshold {
  return (ALERT_THRESHOLDS as readonly number[]).includes(value);
}

export function toClaimedAlerts(rows: readonly { period: BudgetPeriod; threshold: number }[]): ClaimedAlert[] {
  const alerts: ClaimedAlert[] = [];
  for (const row of rows) {
    if (isKnownThreshold(row.threshold)) alerts.push({ period: row.period, threshold: row.threshold });
  }
  return alerts;
}
