/**
 * cleanupSessions unit tests.
 *
 * 통합 시나리오(DB 시드 + cron 트리거 + Storage list/remove)는 DEMO_TEST_DB_URL
 * 환경에서 별도 실행. 본 파일은 export 시그니처와 RESERVED_SESSION_IDS의 단일 출처
 * 보장만 검증.
 */
import { describe, it, expect } from 'vitest';

import {
  PROD_SENTINEL,
  RESERVED_SESSION_IDS,
  SEED_SENTINEL,
} from './sessionContext';
import { cleanupExpiredSessions } from './cleanupSessions';
import type {
  CleanupOptions,
  CleanupResult,
  StorageCleanupFn,
  StorageCleanupResult,
} from './cleanupSessions';

describe('RESERVED_SESSION_IDS', () => {
  it('PROD_SENTINEL과 SEED_SENTINEL을 포함', () => {
    expect(RESERVED_SESSION_IDS.has(PROD_SENTINEL)).toBe(true);
    expect(RESERVED_SESSION_IDS.has(SEED_SENTINEL)).toBe(true);
  });

  it('visitor cuid는 포함하지 않음', () => {
    expect(RESERVED_SESSION_IDS.has('visitor-abc-123')).toBe(false);
    expect(RESERVED_SESSION_IDS.has('any-random-cuid')).toBe(false);
  });

  it('빈 문자열도 포함하지 않음 (sentinel 자체가 아닌 한)', () => {
    expect(RESERVED_SESSION_IDS.has('')).toBe(false);
  });

  it('sentinel 문자열 변경 검증 (typo 회귀 방어)', () => {
    expect(PROD_SENTINEL).toBe('__PROD__');
    expect(SEED_SENTINEL).toBe('__SEED__');
  });
});

describe('cleanupExpiredSessions — export shape', () => {
  it('함수가 정의되어 있음', () => {
    expect(typeof cleanupExpiredSessions).toBe('function');
  });

  it('CleanupOptions / CleanupResult / StorageCleanupFn / StorageCleanupResult 타입이 export됨', () => {
    // 타입 export 자체는 런타임 검증 불가 — TypeScript 컴파일이 타입 가드.
    // 대신 옵션 객체와 mock storage cleanup의 형태로 인터페이스 사용 가능 여부만 검증.
    const opts: CleanupOptions = { now: new Date(), forceSessionIds: [] };
    expect(opts).toBeDefined();

    const cleanupFn: StorageCleanupFn = async (
      _sessionId: string,
    ): Promise<StorageCleanupResult> => ({ filesDeleted: 0, errors: [] });
    expect(typeof cleanupFn).toBe('function');

    const result: CleanupResult = {
      sessionsScanned: 0,
      sessionsDeleted: 0,
      rowsDeletedByModel: {},
      storageFilesDeleted: 0,
      errors: [],
    };
    expect(result.sessionsScanned).toBe(0);
  });
});
