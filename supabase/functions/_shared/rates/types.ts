/** Tasa de venta del BCRD de un día publicado. `date` es YYYY-MM-DD. */
export interface UsdRate {
  date: string;
  sell: number;
}

/** Fila tal como la entrega la fuente, antes de validar. */
export interface RawRateRow {
  date: string;
  sell: string | number;
}

/** La fuente no responde, cambió de formato o trae datos dudosos. Nunca se adivina. */
export class RateSourceError extends Error {}

export interface RateSource {
  /** Va a `usd_rates.source`. */
  id: string;
  fetchRates(from: string, to: string): Promise<UsdRate[]>;
}
