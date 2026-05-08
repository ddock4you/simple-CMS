/**
 * 시연 모드(DEMO_MODE) 만료 sessionId 정리.
 *
 * 호출 패턴:
 *   - cron: `/api/demo/cleanup` (Vercel Hobby plan, daily) → 만료 일괄 정리
 *   - lazy: `ensureDemoSession()` 진입 시 5% 확률로 `after()` 후크
 *   - reset: `/api/demo/reset` → 단일 sessionId 강제 정리
 *
 * 흐름:
 *   1. expires < now 인 Session 수집 → User.sessionId(visitor 격리 식별자) 추출
 *   2. RESERVED_SESSION_IDS 이중 제외 (`__PROD__` / `__SEED__` 절대 보호)
 *   3. 17 모델 deleteMany (자식부터 부모 순서) — runWithBypass 안에서
 *   4. cleanupStorage 콜백 호출 — 호출자가 어댑터로 list/remove 처리
 *   5. Session.deleteMany (User Cascade로 일부 자동 삭제되지만 leftover 보호)
 *
 * 단계별 try/catch: 한 sessionId 또는 한 모델 실패가 다른 정리를 차단하지 않게.
 * Storage 정리는 packages/db가 supabase/s3 의존성을 갖지 않도록 콜백 패턴.
 */
import { prisma } from '../client';

import {
  isBypassed,
  RESERVED_SESSION_IDS,
  runWithBypass,
} from './sessionContext';

export interface StorageCleanupResult {
  filesDeleted: number;
  errors: string[];
}

export interface StorageCleanupFn {
  (sessionId: string): Promise<StorageCleanupResult>;
}

export interface CleanupResult {
  /** 정리 대상 sessionId 수 (RESERVED 제외 후) */
  sessionsScanned: number;
  /** Session.deleteMany로 명시 삭제된 row 수 (User Cascade로 자동 삭제된 건 미포함) */
  sessionsDeleted: number;
  /** 모델별 deleteMany count */
  rowsDeletedByModel: Record<string, number>;
  /** Storage 정리에서 삭제된 파일 누계 */
  storageFilesDeleted: number;
  /** 단계별 에러 메시지. 부분 실패 후에도 호출자에게 가시화 */
  errors: string[];
}

export interface CleanupOptions {
  /** 기준 시각 (default: new Date()). 단위 테스트용 */
  now?: Date;
  /**
   * Storage 정리 콜백. 호출자가 어댑터로 구현.
   * 누락 시 storage 정리 skip — 단위 테스트나 storage 관련 의존성이 없는 환경 fallback.
   */
  cleanupStorage?: StorageCleanupFn;
  /**
   * 특정 sessionId만 정리. 명시 시 expires 검사 skip — `/api/demo/reset` 흐름에서 사용.
   * RESERVED는 항상 제외.
   */
  forceSessionIds?: string[];
}

/**
 * 17개 모델 deleteMany 순서 (자식 → 부모, FK 의존성 따라).
 * cloneSeedToSession의 INSERT 순서를 역순으로 + AuditLog/ErrorLog/PreviewToken 추가.
 */
const DELETE_ORDER: ReadonlyArray<{
  name: string;
  run: (ids: string[]) => Promise<number>;
}> = [
  {
    name: 'NavigationMenuItem',
    run: async (ids) =>
      (
        await prisma.navigationMenuItem.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'SubpageFeedback',
    run: async (ids) =>
      (
        await prisma.subpageFeedback.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'SubpageVersion',
    run: async (ids) =>
      (
        await prisma.subpageVersion.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'PageBlock',
    run: async (ids) =>
      (
        await prisma.pageBlock.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'Post',
    run: async (ids) =>
      (
        await prisma.post.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'Subpage',
    run: async (ids) =>
      (
        await prisma.subpage.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'HomePopup',
    run: async (ids) =>
      (
        await prisma.homePopup.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'HomeSection',
    run: async (ids) =>
      (
        await prisma.homeSection.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'Board',
    run: async (ids) =>
      (
        await prisma.board.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'NavigationMenu',
    run: async (ids) =>
      (
        await prisma.navigationMenu.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'Media',
    run: async (ids) =>
      (
        await prisma.media.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'SiteSettings',
    run: async (ids) =>
      (
        await prisma.siteSettings.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'AuditLog',
    run: async (ids) =>
      (
        await prisma.auditLog.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'ErrorLog',
    run: async (ids) =>
      (
        await prisma.errorLog.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'PreviewToken',
    run: async (ids) =>
      (
        await prisma.previewToken.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'User',
    run: async (ids) =>
      (
        await prisma.user.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
  {
    name: 'Role',
    run: async (ids) =>
      (
        await prisma.role.deleteMany({
          where: { sessionId: { in: ids } },
        })
      ).count,
  },
];

async function findExpiredIsolationIds(now: Date): Promise<string[]> {
  // Session은 extension EXCLUDED라 sessionId 필터 우회. user를 join해 visitor 격리 식별자 회수.
  const expired = await prisma.session.findMany({
    where: { expires: { lt: now } },
    select: {
      id: true,
      user: { select: { sessionId: true } },
    },
  });
  // distinct + RESERVED 제외
  const set = new Set<string>();
  for (const s of expired) {
    const id = s.user.sessionId;
    if (RESERVED_SESSION_IDS.has(id)) continue;
    set.add(id);
  }
  return Array.from(set);
}

async function executeCleanup(
  isolationIds: string[],
  options: CleanupOptions,
): Promise<CleanupResult> {
  const result: CleanupResult = {
    sessionsScanned: isolationIds.length,
    sessionsDeleted: 0,
    rowsDeletedByModel: {},
    storageFilesDeleted: 0,
    errors: [],
  };

  if (isolationIds.length === 0) {
    return result;
  }

  // 1. 17 모델 deleteMany — 자식부터
  for (const step of DELETE_ORDER) {
    try {
      const count = await step.run(isolationIds);
      result.rowsDeletedByModel[step.name] = count;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${step.name}: ${msg}`);
    }
  }

  // 2. Storage 정리 (옵션) — 각 sessionId 폴더
  if (options.cleanupStorage) {
    for (const id of isolationIds) {
      if (RESERVED_SESSION_IDS.has(id)) continue; // 이중 방어
      try {
        const r = await options.cleanupStorage(id);
        result.storageFilesDeleted += r.filesDeleted;
        for (const e of r.errors) {
          result.errors.push(`storage[${id}]: ${e}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`storage[${id}]: ${msg}`);
      }
    }
  }

  // 3. Session 마지막 — User Cascade로 일부 이미 삭제됐을 수 있어 결과 count는 leftover만
  // 강제 reset 흐름(forceSessionIds)에서는 Session이 아직 활성일 수도 있어 명시 deleteMany 필요
  try {
    // expires<now에서 회수했거나 force인 경우, 이 user.sessionId에 묶인 모든 Session 정리
    const sessRes = await prisma.session.deleteMany({
      where: {
        OR: [
          { expires: { lt: options.now ?? new Date() } },
          // force 경로 — User cascade로 이미 사라졌을 가능성 높지만 방어
          { user: { sessionId: { in: isolationIds } } },
        ],
      },
    });
    result.sessionsDeleted = sessRes.count;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Session: ${msg}`);
  }

  return result;
}

/**
 * 만료 sessionId 격리 데이터 + Storage + Session 정리.
 *
 * 호출자가 `runWithBypass` 안에 없어도 자동 wrap한다.
 */
export async function cleanupExpiredSessions(
  options: CleanupOptions = {},
): Promise<CleanupResult> {
  const now = options.now ?? new Date();

  const exec = async (): Promise<CleanupResult> => {
    const ids =
      options.forceSessionIds && options.forceSessionIds.length > 0
        ? options.forceSessionIds.filter((id) => !RESERVED_SESSION_IDS.has(id))
        : await findExpiredIsolationIds(now);

    return executeCleanup(ids, options);
  };

  if (isBypassed()) {
    return exec();
  }
  return runWithBypass(exec);
}
