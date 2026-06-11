/**
 * Demo-mode model registry.
 *
 * Keeps snapshot/clone/cleanup/reset model lists aligned without hiding the
 * explicit Prisma operations in each flow.
 */
export const SNAPSHOT_MODEL_NAMES = [
  'Role',
  'User',
  'Media',
  'SiteSettings',
  'NavigationMenu',
  'Board',
  'HomeSection',
  'Subpage',
  'Post',
  'PageBlock',
  'HomePopup',
  'NavigationMenuItem',
  'SubpageVersion',
  'SubpageFeedback',
] as const;

export type SnapshotModelName = (typeof SNAPSHOT_MODEL_NAMES)[number];

export const CLONE_MODEL_NAMES = SNAPSHOT_MODEL_NAMES;
export type CloneModelName = SnapshotModelName;

export const SNAPSHOT_EXCLUDED_MODEL_NAMES = [
  'AuditLog',
  'ErrorLog',
  'Session',
  'PreviewToken',
] as const;

export const DEMO_ISOLATED_MODEL_NAMES = [
  'Role',
  'User',
  'PreviewToken',
  'Subpage',
  'SubpageFeedback',
  'SubpageVersion',
  'Board',
  'Post',
  'HomeSection',
  'HomePopup',
  'PageBlock',
  'Media',
  'NavigationMenu',
  'NavigationMenuItem',
  'AuditLog',
  'SiteSettings',
  'ErrorLog',
] as const;

export type DemoIsolatedModelName = (typeof DEMO_ISOLATED_MODEL_NAMES)[number];

export const CLEANUP_DELETE_ORDER = [
  'NavigationMenuItem',
  'SubpageFeedback',
  'SubpageVersion',
  'PageBlock',
  'Post',
  'Subpage',
  'HomePopup',
  'HomeSection',
  'Board',
  'NavigationMenu',
  'Media',
  'SiteSettings',
  'AuditLog',
  'ErrorLog',
  'PreviewToken',
  'User',
  'Role',
] as const satisfies ReadonlyArray<DemoIsolatedModelName>;

export type CleanupDeleteModelName = (typeof CLEANUP_DELETE_ORDER)[number];

export const SEED_RESET_DELETE_ORDER = [
  'NavigationMenuItem',
  'SubpageFeedback',
  'SubpageVersion',
  'PageBlock',
  'Post',
  'Subpage',
  'HomePopup',
  'HomeSection',
  'Board',
  'NavigationMenu',
  'Media',
  'SiteSettings',
  'AuditLog',
  'ErrorLog',
  'PreviewToken',
  'User',
  'Role',
] as const satisfies ReadonlyArray<DemoIsolatedModelName>;

export type SeedResetDeleteModelName = (typeof SEED_RESET_DELETE_ORDER)[number];
