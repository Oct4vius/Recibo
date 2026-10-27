import type { Granularity } from './granularity';

export const historyKeys = {
  all: ['history'] as const,
  window: (granularity: Granularity, firstIso: string, timeZone: string) =>
    ['history', granularity, firstIso, timeZone] as const,
  categories: (range: { from: string; to: string } | 'all', timeZone: string) =>
    ['history', 'categories', range === 'all' ? 'all' : range.from, range === 'all' ? 'all' : range.to, timeZone] as const,
  overall: (timeZone: string) => ['history', 'overall', timeZone] as const,
};
