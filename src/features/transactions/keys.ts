import type { TransactionFilters } from './filters';

export const transactionKeys = {
  all: ['transactions'] as const,
  /** La zona va en la key: los rangos "Esta semana"/"Este mes" dependen de ella y Ajustes puede cambiarla. */
  list: (filters: TransactionFilters, timeZone: string) => ['transactions', 'list', timeZone, filters] as const,
  recent: () => ['transactions', 'recent'] as const,
};
