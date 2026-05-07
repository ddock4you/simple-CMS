'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { History, Pin } from 'lucide-react';

import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';

import { recentSubpageVersionsOptions } from '../api/versionQueries';
import { formatVersionSubject, parseVersionLabel } from '../lib/parseVersionLabel';
import {
  SUBPAGE_VERSION_FALLBACK_TEXT,
  SUBPAGE_VERSION_SOURCE_BADGE_VARIANT,
  SUBPAGE_VERSION_SOURCE_LABELS,
} from '../model/versionLabels';

interface RecentVersionsCardProps {
  subpageId: string;
  onViewAll: () => void;
  onViewDetail?: (versionId: string) => void;
}

export function RecentVersionsCard({
  subpageId,
  onViewAll,
  onViewDetail,
}: RecentVersionsCardProps) {
  const { data, isLoading, isError } = useQuery(
    recentSubpageVersionsOptions(subpageId),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" aria-hidden />
            버전 이력
          </CardTitle>
          <CardDescription>최근 저장 5개</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        )}
        {isError && (
          <p className="text-sm text-destructive">
            버전 이력을 불러오지 못했습니다.
          </p>
        )}
        {!isLoading && !isError && data && data.items.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
            저장된 버전이 없습니다.
            <br />
            [버전 저장] 버튼으로 첫 스냅샷을 만들어보세요.
          </p>
        )}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <ul className="divide-y rounded-md border">
            {data.items.map((item) => {
              const parsed = parseVersionLabel(item.label);
              const subject = parsed.subject
                ? formatVersionSubject(parsed.subject)
                : SUBPAGE_VERSION_FALLBACK_TEXT[item.sourceAction];
              const isFallback = !parsed.subject;
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={SUBPAGE_VERSION_SOURCE_BADGE_VARIANT[item.sourceAction]}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {SUBPAGE_VERSION_SOURCE_LABELS[item.sourceAction]}
                    </Badge>
                    {item.isPinned && (
                      <Pin className="size-3 text-warning" aria-hidden />
                    )}
                  </div>
                  <p
                    className={
                      isFallback
                        ? 'text-xs text-muted-foreground'
                        : 'line-clamp-1 font-medium'
                    }
                    title={parsed.subject || undefined}
                  >
                    {subject}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                      {item.createdBy ? ` · ${item.createdBy.name}` : ''}
                    </span>
                    {onViewDetail && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => onViewDetail(item.id)}
                      >
                        상세
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={onViewAll} className="w-full">
          전체 이력 보기
        </Button>
      </CardFooter>
    </Card>
  );
}
