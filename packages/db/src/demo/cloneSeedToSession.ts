/**
 * 시연 모드: `__SEED__` sessionId의 모든 row를 새 sessionId로 in-memory remap 클론.
 *
 * 호출자는 반드시 `demo.runWithBypass(...)` 안에서 호출해야 한다 — Prisma extension의 자동
 * sessionId 주입을 우회하면서 양쪽 sessionId(`__SEED__` 읽기, newSessionId 쓰기)를 코드에서
 * 명시적으로 처리하기 위함. DEMO_MODE !== 'true' 환경(extension 미적용)에서는 그대로 동작한다.
 */
import { prisma } from '../client';

import { isBypassed } from './sessionContext';
import { cloneSeedRows } from './seedClone/cloneSteps';

export { DEMO_ADMIN_USERNAME } from './seedClone/constants';
export type { CloneStats, CloneResult } from './seedClone/types';

const TRANSACTION_TIMEOUT_MS = 30_000;
const TRANSACTION_MAX_WAIT_MS = 5_000;

/**
 * `__SEED__` row 14모델을 새 sessionId로 클론.
 *
 * @throws {SeedNotFoundError} `__SEED__` Role 또는 demo_admin User가 없으면.
 *   bootstrap API는 이 에러를 503 + `{ code: 'SEED_NOT_FOUND' }`로 변환한다.
 */
export async function cloneSeedToSession(newSessionId: string) {
  if (process.env.DEMO_MODE === 'true' && !isBypassed()) {
    throw new Error(
      'cloneSeedToSession must be called inside demo.runWithBypass(...) when DEMO_MODE=true',
    );
  }

  return prisma.$transaction((tx) => cloneSeedRows(tx, newSessionId), {
    timeout: TRANSACTION_TIMEOUT_MS,
    maxWait: TRANSACTION_MAX_WAIT_MS,
  });
}
