export { prisma } from './client';

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
export type { SearchResult, SearchResponse } from './search';

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
