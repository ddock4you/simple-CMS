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

export {
  cloneSeedToSession,
  DEMO_ADMIN_USERNAME,
} from './cloneSeedToSession';
export type { CloneStats, CloneResult } from './cloneSeedToSession';

export { SeedNotFoundError } from './SeedNotFoundError';

export { cleanupExpiredSessions } from './cleanupSessions';
export type {
  CleanupOptions,
  CleanupResult,
  StorageCleanupFn,
  StorageCleanupResult,
} from './cleanupSessions';
