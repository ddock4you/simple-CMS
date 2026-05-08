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
} from './sessionContext';
export type { DemoContext } from './sessionContext';

export { demoExtension } from './clientExtension';
