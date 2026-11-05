export const reportKeys = {
  all: ['reports'] as const,
  month: (startIso: string, timeZone: string) => ['reports', 'month', startIso, timeZone] as const,
  year: (year: number, lastIso: string, timeZone: string) => ['reports', 'year', year, lastIso, timeZone] as const,
};
