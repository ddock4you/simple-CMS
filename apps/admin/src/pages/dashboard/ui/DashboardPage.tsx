import { FileText, SquareKanban, PenSquare, Users } from 'lucide-react';

import { prisma } from '@simple-cms/db';

import { ErrorLogDashboardWidget } from '@/features/error-log/ui/ErrorLogDashboardWidget';
import { StatCard } from '@/shared/ui/layout/StatCard';
import { PageHeader } from '@/shared/ui/PageHeader';

export default async function DashboardPage() {
  const [subpageCount, publishedSubpageCount, boardCount, postCount, publishedPostCount, pendingUserCount] =
    await Promise.all([
      prisma.subpage.count(),
      prisma.subpage.count({ where: { status: 'PUBLISHED' } }),
      prisma.board.count(),
      prisma.post.count(),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.user.count({ where: { status: 'PENDING' } }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        description="콘텐츠 현황을 한눈에 확인하세요."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="서브 페이지"
          value={subpageCount}
          description={`발행: ${publishedSubpageCount}`}
          icon={FileText}
        />
        <StatCard title="게시판" value={boardCount} icon={SquareKanban} />
        <StatCard
          title="게시글"
          value={postCount}
          description={`발행: ${publishedPostCount}`}
          icon={PenSquare}
        />
        <StatCard
          title="승인 대기"
          value={pendingUserCount}
          description="가입 승인 필요"
          icon={Users}
        />
      </div>

      <ErrorLogDashboardWidget />
    </div>
  );
}
