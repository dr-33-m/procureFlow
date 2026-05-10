export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (branchId: string) => [...dashboardKeys.all, 'stats', branchId] as const,
  activity: (branchId: string) => [...dashboardKeys.all, 'activity', branchId] as const,
}
