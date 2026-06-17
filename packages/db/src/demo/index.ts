/**
 * 시연 모드 격리 인프라 진입점.
 * 사용 측: `import { demo } from '@simple-cms/db'; demo.runWithBypass(...)`.
 */
export {
  enterWith,
  runWith,
  runWithBypass,
  getContext,
  getCurrentSessionId,
  isBypassed,
  PROD_SENTINEL,
  SEED_SENTINEL,
  RESERVED_SESSION_IDS,
} from './sessionContext';
export type { DemoContext } from './sessionContext';

export { demoExtension } from './clientExtension';

export { cloneSeedToSession, DEMO_ADMIN_USERNAME } from './cloneSeedToSession';
export type { CloneStats, CloneResult } from './cloneSeedToSession';

export { SeedNotFoundError } from './SeedNotFoundError';

export { cleanupExpiredSessions } from './cleanupSessions';
export type {
  CleanupOptions,
  CleanupResult,
  StorageCleanupFn,
  StorageCleanupResult,
} from './cleanupSessions';

// PR6 — snapshot export/import
export { exportSnapshot } from './exportSnapshot';
export type { ExportOptions } from './exportSnapshot';

export { importSnapshotToSeed } from './importSnapshot';
export type { ImportOptions, ImportStats } from './importSnapshot';

export { createSupabaseSeedStorageCallbacks } from './storage/supabaseSeedStorage';
export type { SupabaseSeedStorageConfig } from './storage/supabaseSeedStorage';

export { resetSeedData } from './resetSeedData';
export type {
  ResetSeedDataOptions,
  ResetSeedDataResult,
} from './resetSeedData';

export {
  processMediaForExport,
  createLocalMediaDownloader,
  createSupabaseMediaDownloader,
  extractStorageKeyFromUrl,
} from './exportMedia';
export type { ProcessedMediaResult, SupabaseDownloader } from './exportMedia';

export { walkSnapshotForRemap } from './snapshotWalker';

export {
  CLEANUP_DELETE_ORDER,
  CLONE_MODEL_NAMES,
  DEMO_ISOLATED_MODEL_NAMES,
  SEED_RESET_DELETE_ORDER,
  SNAPSHOT_EXCLUDED_MODEL_NAMES,
  SNAPSHOT_MODEL_NAMES,
} from './modelRegistry';
export type {
  CleanupDeleteModelName,
  CloneModelName,
  DemoIsolatedModelName,
  SeedResetDeleteModelName,
  SnapshotModelName,
} from './modelRegistry';

export {
  snapshotPayloadSchema,
  SNAPSHOT_SCHEMA_VERSION,
} from './snapshot.types';
export type { SnapshotPayload } from './snapshot.types';
