import type { ErrorLevel, ErrorSource } from '@simple-cms/db';

export type ErrorLevelFilter = ErrorLevel | 'ALL';
export type ErrorSourceFilter = ErrorSource | 'ALL';
export type ResolvedFilter = 'all' | 'unresolved' | 'resolved';

export interface ErrorLogListFilters {
  level: ErrorLevelFilter;
  source: ErrorSourceFilter;
  resolved: ResolvedFilter;
  urlPattern: string | null;
  groupByFingerprint: boolean;
  from: string | null;
  to: string | null;
  page: number;
  pageSize: number;
}

export const DEFAULT_ERROR_LOG_FILTERS: ErrorLogListFilters = {
  level: 'ALL',
  source: 'ALL',
  resolved: 'unresolved',
  urlPattern: null,
  groupByFingerprint: false,
  from: null,
  to: null,
  page: 1,
  pageSize: 20,
};

export interface ErrorLogListItem {
  kind: 'individual';
  id: string;
  level: ErrorLevel;
  source: ErrorSource;
  message: string;
  url: string | null;
  method: string | null;
  statusCode: number | null;
  fingerprint: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedByName: string | null;
  createdAt: string;
}

export interface ErrorLogGroupItem {
  kind: 'group';
  fingerprint: string;
  level: ErrorLevel;
  source: ErrorSource;
  latestMessage: string;
  latestUrl: string | null;
  latestCreatedAt: string;
  latestId: string;
  count: number;
  hasUnresolved: boolean;
}

export type ErrorLogRow = ErrorLogListItem | ErrorLogGroupItem;

export interface ErrorLogDetail {
  id: string;
  level: ErrorLevel;
  source: ErrorSource;
  message: string;
  stack: string | null;
  url: string | null;
  method: string | null;
  statusCode: number | null;
  userAgent: string | null;
  ipAddress: string | null;
  referer: string | null;
  digest: string | null;
  fingerprint: string | null;
  metadata: unknown;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolvedByName: string | null;
  createdAt: string;
}

export const LEVEL_LABELS: Record<ErrorLevel, string> = {
  ERROR: '에러',
  WARN: '경고',
};

export const SOURCE_LABELS: Record<ErrorSource, string> = {
  SERVER_SSR: '서버 SSR',
  SERVER_API: '서버 API',
  SERVER_MIDDLEWARE: '미들웨어',
  CLIENT_REACT: 'React',
  CLIENT_JS: '클라이언트 JS',
};

export const RESOLVED_LABELS: Record<ResolvedFilter, string> = {
  all: '전체',
  unresolved: '미해결',
  resolved: '해결됨',
};
