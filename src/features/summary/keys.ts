import type { BudgetPeriod } from '@/types/database';

export const summaryKeys = {
  all: ['summary'] as const,
  /** Sin `refIso` es el período de hoy (teléfono); con él, el período de esa fecha (escritorio). Mismo prefijo en ambos. */
  period: (period: BudgetPeriod, refIso?: string) =>
    (refIso === undefined ? ['summary', period] : ['summary', period, refIso]) as readonly string[],
};
