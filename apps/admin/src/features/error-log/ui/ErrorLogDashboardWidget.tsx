import { AlertTriangle, CalendarClock, ListChecks } from 'lucide-react';

import { prisma } from '@simple-cms/db';

import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { StatCard } from '@/shared/ui/layout/StatCard';

export async function ErrorLogDashboardWidget() {
  const user = await getCurrentUser();
  if (!hasPermission(user, 'errorLogs', 'read')) {
    return null;
  }

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [count24h, count7d, unresolvedCount] = await Promise.all([
    prisma.errorLog.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.errorLog.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.errorLog.count({ where: { isResolved: false } }),
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="최근 24시간 에러"
        value={count24h}
        description="공개 웹 런타임 에러"
        icon={CalendarClock}
      />
      <StatCard
        title="최근 7일 에러"
        value={count7d}
        description="누적 발생 건수"
        icon={AlertTriangle}
      />
      <StatCard
        title="미해결 에러"
        value={unresolvedCount}
        description="해결 처리 필요"
        icon={ListChecks}
      />
    </div>
  );
}
