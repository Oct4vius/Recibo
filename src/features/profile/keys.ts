export const profileKeys = {
  all: ['profile'] as const,
  me: (userId: string) => ['profile', userId] as const,
};
