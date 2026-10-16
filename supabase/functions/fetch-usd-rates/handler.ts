import { bearerToken, json, UNAUTHORIZED } from '../_shared/http.ts';
import type { UsdRatesRepository } from '../_shared/rates/repository.ts';
import type { RateSource } from '../_shared/rates/types.ts';

export interface FetchUsdRatesDeps {
  secret: string;
  source: RateSource;
  repo: UsdRatesRepository;
}

/**
 * Disparada por pg_cron con FETCH_USD_RATES_SECRET. Pide a la fuente la ventana que dicta SQL y guarda con upsert
 * solo las fechas de esa ventana. Si la fuente falla, no se escribe nada.
 */
export function createFetchUsdRatesHandler(deps: FetchUsdRatesDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (bearerToken(request) !== deps.secret) return json(UNAUTHORIZED, 401);

    let window: { from: string; to: string };
    try {
      window = await deps.repo.fetchWindow();
    } catch {
      // Texto fijo: el mensaje del error puede traer detalles de la base.
      console.error('fetch-usd-rates: the database call failed');
      return json({ error: 'No se pudieron guardar las tasas' }, 500);
    }

    let rates;
    try {
      rates = await deps.source.fetchRates(window.from, window.to);
    } catch {
      console.error('fetch-usd-rates: the rate source failed');
      return json({ error: 'Fuente de tasas no disponible' }, 502);
    }

    // Fechas ISO: la comparación de texto es la de calendario.
    const inWindow = rates.filter((rate) => rate.date >= window.from && rate.date <= window.to);
    try {
      await deps.repo.save(inWindow, deps.source.id);
    } catch {
      console.error('fetch-usd-rates: the database call failed');
      return json({ error: 'No se pudieron guardar las tasas' }, 500);
    }
    return json({ from: window.from, to: window.to, saved: inWindow.length });
  };
}
