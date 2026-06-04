import type { AuditEntityType } from '../generated/prisma/client';

const REDACTED = '[REDACTED]';
const ANONYMIZED_IP = '0.0.0.0';
const ANONYMIZED_USER_AGENT = 'Demo Snapshot';

const SENSITIVE_KEY_PATTERN =
  /(token|password|cookie|authorization|secret|email|ip|useragent|user_agent|ua|session)/i;

type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

export interface SnapshotIdMaps {
  Role: Map<string, string>;
  User: Map<string, string>;
  Media: Map<string, string>;
  SiteSettings: Map<string, string>;
  NavigationMenu: Map<string, string>;
  Board: Map<string, string>;
  HomeSection: Map<string, string>;
  Subpage: Map<string, string>;
  Post: Map<string, string>;
  PageBlock: Map<string, string>;
  HomePopup: Map<string, string>;
  NavigationMenuItem: Map<string, string>;
  SubpageVersion: Map<string, string>;
  SubpageFeedback: Map<string, string>;
  AuditLog?: Map<string, string>;
  ErrorLog?: Map<string, string>;
}

export function sanitizeSnapshotJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSnapshotJson(item));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED
        : sanitizeSnapshotJson(child);
    }
    return result;
  }

  return value;
}

export function anonymizeIp(ip: string | null): string | null {
  return ip ? ANONYMIZED_IP : null;
}

export function anonymizeUserAgent(userAgent: string | null): string | null {
  return userAgent ? ANONYMIZED_USER_AGENT : null;
}

export function remapAuditEntityId(
  entityType: AuditEntityType | null,
  entityId: string | null,
  maps: SnapshotIdMaps,
): string | null {
  if (!entityType || !entityId) return entityId;

  switch (entityType) {
    case 'SUBPAGE':
      return maps.Subpage.get(entityId) ?? null;
    case 'SUBPAGE_VERSION':
      return maps.SubpageVersion.get(entityId) ?? null;
    case 'SUBPAGE_FEEDBACK':
      return maps.SubpageFeedback.get(entityId) ?? null;
    case 'BOARD':
      return maps.Board.get(entityId) ?? null;
    case 'POST':
      return maps.Post.get(entityId) ?? null;
    case 'NAVIGATION_MENU':
      return maps.NavigationMenu.get(entityId) ?? null;
    case 'NAVIGATION_MENU_ITEM':
      return maps.NavigationMenuItem.get(entityId) ?? null;
    case 'HOME_SECTION':
      return maps.HomeSection.get(entityId) ?? null;
    case 'HOME_POPUP':
      return maps.HomePopup.get(entityId) ?? null;
    case 'PAGE_BLOCK':
      return maps.PageBlock.get(entityId) ?? null;
    case 'USER':
      return maps.User.get(entityId) ?? null;
    case 'ROLE':
      return maps.Role.get(entityId) ?? null;
    case 'SITE_SETTINGS':
      return maps.SiteSettings.get(entityId) ?? null;
    case 'ERROR_LOG':
      return maps.ErrorLog?.get(entityId) ?? null;
    case 'MEDIA':
      return maps.Media.get(entityId) ?? null;
    case 'AUDIT_LOG':
      return maps.AuditLog?.get(entityId) ?? null;
    default:
      return null;
  }
}

export function toJsonLike(value: unknown): JsonLike | null {
  if (value === undefined) return null;
  return value as JsonLike;
}
