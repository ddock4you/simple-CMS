'use client';

import { useQuery } from '@tanstack/react-query';

import { homeSectionListOptions } from '@/features/home-management/api/homeQueries';
import { SectionList } from '@/features/home-management/ui/SectionList';

interface HomePageClientProps {
  canUpdate: boolean;
}

export function HomePageClient({ canUpdate }: HomePageClientProps) {
  const { data: sections, isLoading } = useQuery(homeSectionListOptions());

  if (isLoading) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
        섹션이 없습니다. Seed 스크립트(<code>pnpm tsx packages/db/prisma/seed.ts</code>)를 실행해주세요.
      </div>
    );
  }

  return <SectionList sections={sections} canUpdate={canUpdate} />;
}
