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

export type {
  User,
  Role,
  Session,
  Subpage,
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
  Prisma,
} from './generated/prisma/client';

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
} from './generated/prisma/client';
