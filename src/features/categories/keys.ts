export const categoryKeys = {
  all: ['categories'] as const,
  list: () => ['categories', 'list'] as const,
  recent: () => ['categories', 'recent'] as const,
  ruleCount: (categoryId: string) => ['categories', 'rule-count', categoryId] as const,
};
