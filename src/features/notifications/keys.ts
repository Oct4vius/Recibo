export const notificationKeys = {
  all: ['notifications'] as const,
  device: () => ['notifications', 'device'] as const,
};
