/**
 * cloneSeedToSession 단위 테스트.
 *
 * 본격적인 통합 smoke(실제 PG에서 __SEED__ → newSessionId 복제 검증)는 DEMO_TEST_DB_URL
 * 환경 변수 게이트로 별도 테스트 DB가 필요. PR4 1차에서는 SeedNotFoundError + DEMO_ADMIN_USERNAME
 * 상수 + JSDoc invariant만 단위로 커버. 운영자는 `pnpm db:demo-seed` 실행 + admin 시연 진입으로
 * end-to-end 검증.
 *
 * 통합 smoke 추가 시 시나리오 (PR4 후속):
 *   - Role x2 / User x1 / Subpage x1 / PageBlock x1 / NavigationMenu x1 / NavigationMenuItem(parent+child) 시드
 *   - cloneSeedToSession 호출 후:
 *     - 14모델 카운트 일치
 *     - User.roleId, Subpage.featuredImageId, PageBlock.subpageId, NavigationMenuItem.menuId/parentId/subpageId
 *       모두 새 sessionId의 row id로 remap
 *     - SeedNotFoundError throw (Role 0건일 때, demo_admin User 없을 때)
 *     - NavigationMenuItem.parentId 2-pass: parent와 child 모두 새 id, parentId가 새 child의 id를 가리킴
 */
import { describe, expect, it } from 'vitest';

import {
  cloneSeedToSession,
  DEMO_ADMIN_USERNAME,
} from './cloneSeedToSession';
import { SeedNotFoundError } from './SeedNotFoundError';

describe('SeedNotFoundError', () => {
  it('extends Error with default message and code', () => {
    const err = new SeedNotFoundError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('SeedNotFoundError');
    expect(err.code).toBe('SEED_NOT_FOUND');
    expect(err.message).toContain('demo-seed');
  });

  it('accepts custom message', () => {
    const err = new SeedNotFoundError('custom reason');
    expect(err.message).toBe('custom reason');
    expect(err.code).toBe('SEED_NOT_FOUND');
  });
});

describe('DEMO_ADMIN_USERNAME', () => {
  it('is the canonical demo admin username (used in demo-seed.ts and bootstrap)', () => {
    // 이 상수가 바뀌면 demo-seed.ts도 함께 바뀌어야 함 (intentional contract).
    // demo-seed.ts에서 `demo_admin` username으로 User를 생성하므로 일치 필수.
    expect(DEMO_ADMIN_USERNAME).toBe('demo_admin');
  });
});

describe('cloneSeedToSession (signature contract)', () => {
  it('exists and is async', () => {
    expect(typeof cloneSeedToSession).toBe('function');
    // 함수 호출 시 Promise 반환 — invariant 검증 (실제 DB 호출은 통합 smoke에서)
    expect(cloneSeedToSession.constructor.name).toBe('AsyncFunction');
  });
});
