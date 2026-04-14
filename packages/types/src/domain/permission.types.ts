export type ResourceKey =
  | 'dashboard'
  | 'subpages'
  | 'boards'
  | 'posts'
  | 'navigation'
  | 'home'
  | 'media'
  | 'users'
  | 'roles'
  | 'auditLogs'
  | 'errorLogs'
  | 'settings';

export type Action = 'create' | 'read' | 'update' | 'delete';

export interface ResourceAction {
  name: string;
  actions: Action[];
}

export const RESOURCE_ACTIONS: Record<ResourceKey, ResourceAction> = {
  dashboard: { name: '대시보드', actions: ['read'] },
  subpages: { name: '서브 페이지', actions: ['create', 'read', 'update', 'delete'] },
  boards: { name: '게시판', actions: ['create', 'read', 'update', 'delete'] },
  posts: { name: '게시글', actions: ['create', 'read', 'update', 'delete'] },
  navigation: {
    name: '메뉴 관리',
    actions: ['create', 'read', 'update', 'delete'],
  },
  home: {
    name: '메인 페이지',
    actions: ['create', 'read', 'update', 'delete'],
  },
  media: {
    name: '미디어 라이브러리',
    actions: ['create', 'read', 'update', 'delete'],
  },
  users: {
    name: '사용자 관리',
    actions: ['create', 'read', 'update', 'delete'],
  },
  roles: {
    name: '권한 관리',
    actions: ['create', 'read', 'update', 'delete'],
  },
  auditLogs: { name: '감사 로그', actions: ['read'] },
  errorLogs: { name: '에러 로그', actions: ['read', 'update'] },
  settings: { name: '사이트 설정', actions: ['read', 'update'] },
};

export type PermissionMap = {
  [K in ResourceKey]?: {
    [A in Action]?: boolean;
  };
};
