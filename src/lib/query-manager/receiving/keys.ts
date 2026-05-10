export const receivingKeys = {
  all: ['receiving'] as const,
  lists: (branchId: string) => [...receivingKeys.all, 'lists', branchId] as const,
  list: (branchId: string, id: string) => [...receivingKeys.all, 'list', branchId, id] as const,
}
