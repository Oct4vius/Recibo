export const budgetKeys = {
  all: ['budgets'] as const,
  active: () => ['budgets', 'active'] as const,
};
