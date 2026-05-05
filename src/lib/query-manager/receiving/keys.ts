export const receivingKeys = {
  all: ['receiving'] as const,
  lists: () => [...receivingKeys.all, 'lists'] as const,
  list: (id: string) => [...receivingKeys.all, 'list', id] as const,
}
