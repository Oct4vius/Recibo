export const categoryKeys = {
  all: ['categories'] as const,
  list: () => ['categories', 'list'] as const,
  recent: () => ['categories', 'recent'] as const,
};
