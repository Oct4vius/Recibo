import type { TransactionFilters } from './filters';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: TransactionFilters) => ['transactions', 'list', filters] as const,
  recent: () => ['transactions', 'recent'] as const,
};
