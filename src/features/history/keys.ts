import type { Granularity } from './granularity';

export const historyKeys = {
  all: ['history'] as const,
  window: (granularity: Granularity, firstIso: string, timeZone: string) =>
    ['history', granularity, firstIso, timeZone] as const,
  categories: (from: string | null, to: string | null, timeZone: string) =>
    ['history', 'categories', from ?? 'all', to ?? 'all', timeZone] as const,
  overall: (timeZone: string) => ['history', 'overall', timeZone] as const,
};
