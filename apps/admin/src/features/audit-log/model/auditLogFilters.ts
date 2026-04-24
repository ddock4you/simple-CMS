import type { AuditAction, AuditEntityType } from '@simple-cms/db';

export type AuditActionFilter = AuditAction | 'ALL';

export interface AuditLogListFilters {
  action: AuditActionFilter;
  entityType: string | null;
  userId: string | null;
  from: string | null;
  to: string | null;
  page: number;
  pageSize: number;
}

export const DEFAULT_AUDIT_LOG_FILTERS: AuditLogListFilters = {
  action: 'ALL',
  entityType: null,
  userId: null,
  from: null,
  to: null,
  page: 1,
  pageSize: 20,
};

export interface AuditLogListItem {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType | null;
  entityId: string | null;
  entityTitle: string | null;
  changes: unknown;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface UserOption {
  id: string;
  name: string;
}

// 한글 라벨 맵
export const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: '생성',
  UPDATE: '수정',
  DELETE: '삭제',
  LOGIN: '로그인',
  LOGOUT: '로그아웃',
};

export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  SUBPAGE: '서브 페이지',
  SUBPAGE_VERSION: '서브페이지 버전',
  BOARD: '게시판',
  POST: '게시글',
  NAVIGATION_MENU: '메뉴',
  NAVIGATION_MENU_ITEM: '메뉴 항목',
  HOME_SECTION: '메인 섹션',
  HOME_POPUP: '메인 팝업',
  PAGE_BLOCK: '서브페이지 블록',
  USER: '사용자',
  ROLE: '역할',
  SITE_SETTINGS: '사이트 설정',
  ERROR_LOG: '에러 로그',
  MEDIA: '미디어',
};
