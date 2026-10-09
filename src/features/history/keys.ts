import type { Granularity } from './granularity';

export const historyKeys = {
  all: ['history'] as const,
  window: (granularity: Granularity, firstIso: string, timeZone: string) =>
    ['history', granularity, firstIso, timeZone] as const,
};
