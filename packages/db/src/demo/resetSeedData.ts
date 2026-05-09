/**
 * 시연 모드 PR6: `__SEED__` row + Storage 파일 일괄 정리.
 *
 * 호출 패턴:
 *   - import 흐름의 Phase 1 첫 단계 — 기존 시드를 깨끗이 비우고 새 시드 적재 준비
 *   - Storage 정리는 callback 패턴 (packages/db에 supabase 의존성 0)
 *
 * **`cleanupExpiredSessions`와 분리된 이유**:
 *   cleanupExpiredSessions는 visitor 만료 정리 + RESERVED_SESSION_IDS 보호가 책임.
 *   시드 reset은 운영자의 명시적 의도라 가드를 우회해야 한다 — 같은 함수에서 분기하면
 *   미래 코드가 RESERVED 가드를 실수로 우회할 위험. 별도 함수로 명시.
 *
 * **자동 wrap**:
 *   `runWithBypass` 자동 적용 — extension 필터 우회. 호출자는 wrap 신경 X.
 */
import { prisma } from '../client';

import { isBypassed, runWithBypass, SEED_SENTINEL } from './sessionContext';

export interface ResetSeedDataResult {
  /** 모델별 deleteMany count */
  rowsDeletedByModel: Record<string, number>;
  /** Storage 정리에서 삭제된 파일 누계 */
  storageFilesDeleted: number;
  /** 단계별 에러 */
  errors: string[];
}

export interface ResetSeedDataOptions {
  /**
   * Storage `__SEED__/` 폴더 정리 callback.
   * 호출자가 Supabase adapter의 `cleanupSeedFolder()`를 주입.
   * 누락 시 Storage 정리 skip — DB 일관성만 보장하면 되는 dev/테스트 시나리오.
   */
  cleanupStorage?: () => Promise<{ filesDeleted: number; errors: string[] }>;
}

const DELETE_ORDER: ReadonlyArray<{
  name: string;
  run: () => Promise<number>;
}> = [
  // 자식 → 부모 순 (FK 의존성). cloneSeedToSession INSERT 순서 역순.
  {
    name: 'NavigationMenuItem',
    run: async () =>
      (
        await prisma.navigationMenuItem.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'SubpageFeedback',
    run: async () =>
      (
        await prisma.subpageFeedback.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'SubpageVersion',
    run: async () =>
      (
        await prisma.subpageVersion.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'PageBlock',
    run: async () =>
      (
        await prisma.pageBlock.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'Post',
    run: async () =>
      (
        await prisma.post.deleteMany({ where: { sessionId: SEED_SENTINEL } })
      ).count,
  },
  {
    name: 'Subpage',
    run: async () =>
      (
        await prisma.subpage.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'HomePopup',
    run: async () =>
      (
        await prisma.homePopup.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'HomeSection',
    run: async () =>
      (
        await prisma.homeSection.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'Board',
    run: async () =>
      (
        await prisma.board.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'NavigationMenu',
    run: async () =>
      (
        await prisma.navigationMenu.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'Media',
    run: async () =>
      (
        await prisma.media.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'SiteSettings',
    run: async () =>
      (
        await prisma.siteSettings.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'User',
    run: async () =>
      (
        await prisma.user.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
  {
    name: 'Role',
    run: async () =>
      (
        await prisma.role.deleteMany({
          where: { sessionId: SEED_SENTINEL },
        })
      ).count,
  },
];

export async function resetSeedData(
  options: ResetSeedDataOptions = {},
): Promise<ResetSeedDataResult> {
  const exec = async (): Promise<ResetSeedDataResult> => {
    const result: ResetSeedDataResult = {
      rowsDeletedByModel: {},
      storageFilesDeleted: 0,
      errors: [],
    };

    // 1. 14모델 deleteMany
    for (const step of DELETE_ORDER) {
      try {
        const count = await step.run();
        result.rowsDeletedByModel[step.name] = count;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${step.name}: ${msg}`);
      }
    }

    // 2. Storage 정리 (옵션)
    if (options.cleanupStorage) {
      try {
        const r = await options.cleanupStorage();
        result.storageFilesDeleted = r.filesDeleted;
        for (const e of r.errors) {
          result.errors.push(`storage: ${e}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`storage: ${msg}`);
      }
    }

    return result;
  };

  if (isBypassed()) {
    return exec();
  }
  return runWithBypass(exec);
}
