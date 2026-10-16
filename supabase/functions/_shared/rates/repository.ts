import type { UsdRate } from './types.ts';

/** Lo único que `fetch-usd-rates` necesita de la base: qué rango pedir y guardar lo leído. */
export interface UsdRatesRepository {
  fetchWindow(): Promise<{ from: string; to: string }>;
  save(rates: UsdRate[], sourceId: string): Promise<void>;
}
