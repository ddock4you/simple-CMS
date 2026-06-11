import { redirect } from 'next/navigation';

import { demo, prisma, SNAPSHOT_MODEL_NAMES } from '@simple-cms/db';
import type { SnapshotModelName } from '@simple-cms/db';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { PageHeader } from '@/shared/ui/PageHeader';
import { DemoSnapshotForm } from '@/features/site-settings/ui/DemoSnapshotForm';
import { SettingsNav } from '@/features/site-settings/ui/SettingsNav';

/**
 * 시연 스냅샷 설정 페이지 (PR7).
 *
 * - 운영(__PROD__) 또는 dev 환경의 snapshot 대상 모델 row count + Media 합계 사이즈를 미리보기
 * - [내보내기]: GET /api/demo/snapshot/export (파일 다운로드)
 * - [Supabase 즉시 적용]: POST /api/demo/snapshot/import (시연 환경에서만 동작)
 *
 * 권한: demo-snapshot:read 필요. 일반 관리자 default 미부여(운영자 전용).
 */
export default async function DemoSnapshotPage() {
  const user = await requireAuth();

  if (!hasPermission(user, 'demo-snapshot', 'read')) {
    redirect('/dashboard');
  }

  // 운영 sentinel(__PROD__) row count 회수.
  // 시연 환경에서 admin은 visitor sessionId 컨텍스트라 그냥 count() 부르면 visitor 데이터만 보임.
  // demo.runWithBypass로 extension 우회 + sourceSessionId='__PROD__' 명시.
  const stats = await demo.runWithBypass(async () => {
    const sourceSessionId = demo.PROD_SENTINEL;

    const [rowCountEntries, mediaSizeAgg] = await Promise.all([
      Promise.all(
        SNAPSHOT_MODEL_NAMES.map(
          async (modelName) =>
            [
              modelName,
              await countSnapshotRows(modelName, sourceSessionId),
            ] as const,
        ),
      ),
      prisma.media.aggregate({
        where: { sessionId: sourceSessionId },
        _sum: { size: true },
      }),
    ]);
    const rowCounts = Object.fromEntries(rowCountEntries) as Record<
      SnapshotModelName,
      number
    >;

    return {
      rowCounts,
      totalRows: Object.values(rowCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
      mediaSizeBytes: Number(mediaSizeAgg._sum.size ?? 0),
    };
  });

  const canExport = hasPermission(user, 'demo-snapshot', 'create');
  const canImport = hasPermission(user, 'demo-snapshot', 'update');
  const isDemoMode = process.env.DEMO_MODE === 'true';

  return (
    <div className="space-y-6">
      <PageHeader
        title="사이트 설정"
        description="사이트 전역 설정을 관리합니다."
        tabs={<SettingsNav />}
      />
      <div>
        <h2 className="text-lg font-semibold">시연 스냅샷</h2>
        <p className="text-sm text-muted-foreground mb-4">
          현재 운영 데이터를 시연 환경의 시드(<code>__SEED__</code>)로
          export/import합니다. 내보낸 JSON은 {SNAPSHOT_MODEL_NAMES.length}개
          snapshot 대상 모델과 sharp로 1600px 리사이즈된 Media base64를
          포함하며, User 비밀번호와 운영자 식별자(uploadedById)는 자동으로
          제거/익명화됩니다. AuditLog와 ErrorLog는 snapshot에서 제외합니다. 즉시
          적용은 <code>DEMO_MODE=true</code> 시연 환경에서만 동작합니다.
        </p>
        <DemoSnapshotForm
          stats={stats}
          canExport={canExport}
          canImport={canImport}
          isDemoMode={isDemoMode}
          modelCount={SNAPSHOT_MODEL_NAMES.length}
        />
      </div>
    </div>
  );
}

function countSnapshotRows(
  modelName: SnapshotModelName,
  sourceSessionId: string,
): Promise<number> {
  const where = { sessionId: sourceSessionId };
  switch (modelName) {
    case 'Role':
      return prisma.role.count({ where });
    case 'User':
      return prisma.user.count({ where });
    case 'Media':
      return prisma.media.count({ where });
    case 'SiteSettings':
      return prisma.siteSettings.count({ where });
    case 'NavigationMenu':
      return prisma.navigationMenu.count({ where });
    case 'Board':
      return prisma.board.count({ where });
    case 'HomeSection':
      return prisma.homeSection.count({ where });
    case 'Subpage':
      return prisma.subpage.count({ where });
    case 'Post':
      return prisma.post.count({ where });
    case 'PageBlock':
      return prisma.pageBlock.count({ where });
    case 'HomePopup':
      return prisma.homePopup.count({ where });
    case 'NavigationMenuItem':
      return prisma.navigationMenuItem.count({ where });
    case 'SubpageVersion':
      return prisma.subpageVersion.count({ where });
    case 'SubpageFeedback':
      return prisma.subpageFeedback.count({ where });
  }
}
