import { createServiceClient } from '../_shared/db.ts';
import { createBcrdSource } from '../_shared/rates/bcrd.ts';
import { createUsdRatesRepository } from '../_shared/rates/supabase-repository.ts';
import { createFetchUsdRatesHandler } from './handler.ts';

const secret = Deno.env.get('FETCH_USD_RATES_SECRET');
if (!secret) throw new Error('missing FETCH_USD_RATES_SECRET');

Deno.serve(
  createFetchUsdRatesHandler({
    secret,
    source: createBcrdSource(fetch),
    repo: createUsdRatesRepository(createServiceClient()),
  }),
);
