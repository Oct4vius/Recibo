/** Umbrales de aviso de presupuesto que existen (porcentaje). Fuente: CHECK de `profiles.alert_thresholds`. */
export const ALERT_THRESHOLDS = [80, 100] as const;
export type AlertThreshold = (typeof ALERT_THRESHOLDS)[number];

/** Umbrales tras encender o apagar uno. Se calcula desde lo que el usuario ve, no desde el servidor. */
export function nextThresholds(shown: readonly number[], threshold: AlertThreshold, on: boolean): number[] {
  return ALERT_THRESHOLDS.filter((t) => (t === threshold ? on : shown.includes(t)));
}
