export const rateKeys = {
  all: ['rates'] as const,
  latest: () => ['rates', 'latest'] as const,
};
