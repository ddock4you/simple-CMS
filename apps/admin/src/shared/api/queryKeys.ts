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
  options: () => [...boardKeys.all, 'options'] as const,
};

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: unknown) => [...postKeys.lists(), filters] as const,
  detail: (id: string) => [...postKeys.all, 'detail', id] as const,
};

export const navigationKeys = {
  all: ['navigation'] as const,
  lists: () => [...navigationKeys.all, 'list'] as const,
  detail: (menuId: string) => [...navigationKeys.all, 'detail', menuId] as const,
};

export const homeKeys = {
  all: ['home'] as const,
  lists: () => [...homeKeys.all, 'list'] as const,
  detail: (id: string) => [...homeKeys.all, 'detail', id] as const,
  references: () => [...homeKeys.all, 'references'] as const,
};

export const popupKeys = {
  all: ['home-popups'] as const,
  lists: () => [...popupKeys.all, 'list'] as const,
  detail: (id: string) => [...popupKeys.all, 'detail', id] as const,
};

export const linkTargetKeys = {
  all: ['link-target'] as const,
  references: () => [...linkTargetKeys.all, 'references'] as const,
};

export const auditLogKeys = {
  all: ['auditLogs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: unknown) => [...auditLogKeys.lists(), filters] as const,
};

export const errorLogKeys = {
  all: ['errorLogs'] as const,
  lists: () => [...errorLogKeys.all, 'list'] as const,
  list: (filters: unknown) => [...errorLogKeys.lists(), filters] as const,
  detail: (id: string) => [...errorLogKeys.all, 'detail', id] as const,
};

export const settingsKeys = {
  all: ['settings'] as const,
  domain: () => [...settingsKeys.all, 'domain'] as const,
  security: () => [...settingsKeys.all, 'security'] as const,
  upload: () => [...settingsKeys.all, 'upload'] as const,
  branding: () => [...settingsKeys.all, 'branding'] as const,
};

export const mediaKeys = {
  all: ['media'] as const,
  lists: () => [...mediaKeys.all, 'list'] as const,
  list: (filters: unknown) => [...mediaKeys.lists(), filters] as const,
  detail: (id: string) => [...mediaKeys.all, 'detail', id] as const,
  references: (id: string) => [...mediaKeys.all, 'references', id] as const,
};

export const blockKeys = {
  all: ['blocks'] as const,
  lists: (subpageId: string) =>
    [...blockKeys.all, 'list', subpageId] as const,
  detail: (subpageId: string, blockId: string) =>
    [...blockKeys.all, 'detail', subpageId, blockId] as const,
};

export const subpageVersionKeys = {
  all: ['subpage-versions'] as const,
  lists: (subpageId: string) =>
    [...subpageVersionKeys.all, 'list', subpageId] as const,
  list: (subpageId: string, filters: unknown) =>
    [...subpageVersionKeys.lists(subpageId), filters] as const,
  detail: (subpageId: string, versionId: string) =>
    [...subpageVersionKeys.all, 'detail', subpageId, versionId] as const,
  recent: (subpageId: string) =>
    [...subpageVersionKeys.all, 'recent', subpageId] as const,
};
