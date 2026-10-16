import { assertEquals } from 'jsr:@std/assert@1';
import type { UsdRatesRepository } from '../_shared/rates/repository.ts';
import { type RateSource, RateSourceError, type UsdRate } from '../_shared/rates/types.ts';
import { createFetchUsdRatesHandler } from './handler.ts';

const req = (token: string) => new Request('http://x/fetch-usd-rates', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });

function fakeRepo(window: { from: string; to: string }, store = new Map<string, number>()) {
  const saved: string[] = [];
  const repo: UsdRatesRepository = {
    fetchWindow: () => Promise.resolve(window),
    save(rates, sourceId) {
      saved.push(sourceId);
      for (const rate of rates) store.set(rate.date, rate.sell);
      return Promise.resolve();
    },
  };
  return { repo, store, saved };
}

function fakeSource(result: UsdRate[] | Error) {
  const calls: [string, string][] = [];
  const source: RateSource = {
    id: 'bcrd',
    fetchRates(from, to) {
      calls.push([from, to]);
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
    },
  };
  return { source, calls };
}

async function captureErrors<T>(run: () => Promise<T>): Promise<{ result: T; logged: unknown[][] }> {
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    return { result: await run(), logged };
  } finally {
    console.error = original;
  }
}

Deno.test('only the cron secret can fetch rates', async () => {
  const { repo } = fakeRepo({ from: '2026-10-01', to: '2026-10-15' });
  const { source, calls } = fakeSource([]);
  const handler = createFetchUsdRatesHandler({ secret: 's3cret', source, repo });
  assertEquals((await handler(req('wrong'))).status, 401);
  assertEquals(calls, []);
});

Deno.test('backfills history from the window start to today', async () => {
  const { repo, store, saved } = fakeRepo({ from: '2026-08-01', to: '2026-10-15' });
  const { source, calls } = fakeSource([
    { date: '2026-07-31', sell: 58.9 },
    { date: '2026-08-03', sell: 59.0 },
    { date: '2026-10-14', sell: 61.2 },
    { date: '2026-10-16', sell: 61.3 },
  ]);
  const response = await createFetchUsdRatesHandler({ secret: 's3cret', source, repo })(req('s3cret'));
  assertEquals(calls, [['2026-08-01', '2026-10-15']]);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { from: '2026-08-01', to: '2026-10-15', saved: 2 });
  assertEquals(Object.fromEntries(store), { '2026-08-03': 59.0, '2026-10-14': 61.2 });
  assertEquals(saved, ['bcrd']);
});

Deno.test('asks the source for the whole window, not just today', async () => {
  const { repo } = fakeRepo({ from: '2026-10-01', to: '2026-10-15' });
  const { source, calls } = fakeSource([]);
  await createFetchUsdRatesHandler({ secret: 's3cret', source, repo })(req('s3cret'));
  assertEquals(calls, [['2026-10-01', '2026-10-15']]);
});

Deno.test('running twice leaves the same rows (idempotent upsert)', async () => {
  const { repo, store } = fakeRepo({ from: '2026-10-01', to: '2026-10-15' });
  const { source } = fakeSource([{ date: '2026-10-13', sell: 61.5396 }, { date: '2026-10-12', sell: 61.0 }]);
  const handler = createFetchUsdRatesHandler({ secret: 's3cret', source, repo });
  await handler(req('s3cret'));
  const first = Object.fromEntries(store);
  await handler(req('s3cret'));
  assertEquals(Object.fromEntries(store), first);
  assertEquals(store.size, 2);
});

Deno.test('a source failure saves nothing and keeps the stored rates', async () => {
  const store = new Map([['2026-09-11', 59.4]]);
  const { repo, saved } = fakeRepo({ from: '2026-09-01', to: '2026-10-15' }, store);
  const { source } = fakeSource(new RateSourceError('maintenance page'));
  const { result, logged } = await captureErrors(() => createFetchUsdRatesHandler({ secret: 's3cret', source, repo })(req('s3cret')));
  assertEquals(result.status, 502);
  assertEquals(await result.json(), { error: 'Fuente de tasas no disponible' });
  assertEquals(saved, []);
  assertEquals(Object.fromEntries(store), { '2026-09-11': 59.4 });
  assertEquals(logged, [['fetch-usd-rates: the rate source failed', 'maintenance page']]);
});

Deno.test('a database failure answers 500 with a fixed log line', async () => {
  const { repo } = fakeRepo({ from: '2026-10-01', to: '2026-10-15' });
  repo.save = () => Promise.reject(new Error('relation usd_rates is locked'));
  const { source } = fakeSource([{ date: '2026-10-13', sell: 61.5 }]);
  const { result, logged } = await captureErrors(() => createFetchUsdRatesHandler({ secret: 's3cret', source, repo })(req('s3cret')));
  assertEquals(result.status, 500);
  assertEquals(await result.json(), { error: 'No se pudieron guardar las tasas' });
  assertEquals(logged, [['fetch-usd-rates: the database call failed']]);
});

Deno.test('a failing window lookup also answers 500 and never calls the source', async () => {
  const { repo } = fakeRepo({ from: '2026-10-01', to: '2026-10-15' });
  repo.fetchWindow = () => Promise.reject(new Error('boom'));
  const { source, calls } = fakeSource([]);
  const { result, logged } = await captureErrors(() => createFetchUsdRatesHandler({ secret: 's3cret', source, repo })(req('s3cret')));
  assertEquals(result.status, 500);
  assertEquals(logged, [['fetch-usd-rates: the database call failed']]);
  assertEquals(calls, []);
});

Deno.test('an unexpected source error is logged without its message', async () => {
  const { repo } = fakeRepo({ from: '2026-10-01', to: '2026-10-15' });
  const { source } = fakeSource(new Error('token abc in message'));
  const { result, logged } = await captureErrors(() => createFetchUsdRatesHandler({ secret: 's3cret', source, repo })(req('s3cret')));
  assertEquals(result.status, 502);
  assertEquals(logged, [['fetch-usd-rates: the rate source failed', 'unexpected error']]);
});
