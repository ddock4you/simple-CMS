export { prisma } from './client';

export * as demo from './demo';

// 시연 모드 클론 + 에러 + cleanup + snapshot — 자주 쓰이는 진입점이라 top-level에도 노출
export {
  cloneSeedToSession,
  DEMO_ADMIN_USERNAME,
  SeedNotFoundError,
  cleanupExpiredSessions,
  exportSnapshot,
  importSnapshotToSeed,
  resetSeedData,
  snapshotPayloadSchema,
  SNAPSHOT_SCHEMA_VERSION,
  createLocalMediaDownloader,
  createSupabaseMediaDownloader,
  extractStorageKeyFromUrl,
  processMediaForExport,
} from './demo';
export type {
  CloneStats,
  CloneResult,
  CleanupOptions,
  CleanupResult,
  StorageCleanupFn,
  StorageCleanupResult,
  ExportOptions,
  ImportOptions,
  ImportStats,
  SnapshotPayload,
} from './demo';

export {
  createSession,
  validateSession,
  getSessionUser,
  deleteSession,
  deleteUserSessions,
  deleteExpiredSessions,
  countUserSessions,
} from './sessionHelper';

export { logAuditEvent } from './auditLog';

export {
  getSiteSetting,
  setSiteSetting,
  deleteSiteSetting,
  getSiteSettings,
} from './siteSettings';

export { getUploadRestrictions, validateFileUpload } from './uploadRestriction';
export type { UploadRestrictions } from './uploadRestriction';

export { searchContent } from './search';
export type { SearchContentType, SearchResult, SearchResponse } from './search';

export {
  logWebError,
  cleanupErrorLogs,
  computeErrorFingerprint,
} from './errorLog';
export type { LogWebErrorInput } from './errorLog';

export { cleanupOldFeedback } from './feedbackCleanup';

export {
  createSubpageVersionSnapshot,
  restoreSubpageFromVersion,
  findDanglingMediaIds,
  RevisionMismatchError,
  SubpageVersionNotFoundError,
  SubpageVersionSlugConflictError,
  SUBPAGE_VERSION_RETENTION_LIMIT,
} from './subpageVersion';
export type {
  SubpageSnapshotPayload,
  CreateSubpageVersionSnapshotInput,
  RestoreSubpageFromVersionInput,
  RestoreSubpageFromVersionResult,
} from './subpageVersion';

export type {
  User,
  Role,
  Session,
  Subpage,
  SubpageVersion,
  SubpageFeedback,
  Board,
  Post,
  HomeSection,
  HomePopup,
  PageBlock,
  Media,
  NavigationMenu,
  NavigationMenuItem,
  AuditLog,
  SiteSettings,
  ErrorLog,
} from './generated/prisma/client';

export { Prisma } from './generated/prisma/client';

export {
  UserStatus,
  ContentStatus,
  BoardSkinType,
  HomeSectionType,
  HomePopupType,
  PageBlockType,
  NavigationMenuItemType,
  NavigationMenuSlot,
  AuditAction,
  AuditEntityType,
  ErrorLevel,
  ErrorSource,
  CclType,
  SubpageVersionSource,
  FeedbackRating,
} from './generated/prisma/client';
