export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
};

export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
};

export const subpageKeys = {
  all: ['subpages'] as const,
  lists: () => [...subpageKeys.all, 'list'] as const,
  list: (filters: unknown) => [...subpageKeys.lists(), filters] as const,
  detail: (id: string) => [...subpageKeys.all, 'detail', id] as const,
};

export const boardKeys = {
  all: ['boards'] as const,
  lists: () => [...boardKeys.all, 'list'] as const,
  list: (filters: unknown) => [...boardKeys.lists(), filters] as const,
  detail: (id: string) => [...boardKeys.all, 'detail', id] as const,
};
