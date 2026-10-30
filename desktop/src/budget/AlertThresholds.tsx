import { useState } from 'react';
import { useUpdateAlertThresholds } from '@/features/notifications/threshold-hooks';
import { ALERT_THRESHOLDS, nextThresholds, type AlertThreshold } from '@/features/profile/alerts';
import { useProfile } from '@/features/profile/hooks';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { thresholdLabel } from './budget-text';

/**
 * Una casilla por umbral. Mientras se guarda se muestra el valor enviado y las casillas se desactivan: así dos clics
 * seguidos no se pisan (el siguiente valor sale de lo que se ve).
 */
export function AlertThresholds() {
  const profile = useProfile();
  const update = useUpdateAlertThresholds();
  const [error, setError] = useState<string | null>(null);
  const shown = (update.isPending ? update.variables.thresholds : undefined) ?? profile.data?.alertThresholds ?? [];

  const toggle = (threshold: AlertThreshold, on: boolean) => {
    setError(null);
    update.mutate({ thresholds: nextThresholds(shown, threshold, on), turnedOn: on }, { onError: () => setError(SAVE_ERROR) });
  };

  return (
    <section className="budget-block" aria-label="Avisos">
      <h2>Avisos</h2>
      {ALERT_THRESHOLDS.map((threshold) => (
        <label key={threshold} className="threshold">
          <input
            type="checkbox"
            checked={shown.includes(threshold)}
            disabled={!profile.data || update.isPending}
            onChange={(event) => toggle(threshold, event.target.checked)}
          />
          {thresholdLabel(threshold)}
        </label>
      ))}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
