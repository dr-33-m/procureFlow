export const profileKeys = {
  all: ['profile'] as const,
  logto: () => [...profileKeys.all, 'logto'] as const,
}
