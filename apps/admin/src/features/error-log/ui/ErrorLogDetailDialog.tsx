'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/Button';
import { Separator } from '@/shared/ui/shadcn/separator';

import { errorLogDetailOptions } from '../api/errorLogQueries';
import { ErrorLevelBadge } from './ErrorLevelBadge';
import { ErrorSourceBadge } from './ErrorSourceBadge';
import { ResolveErrorLogButton } from './ResolveErrorLogButton';

interface ErrorLogDetailDialogProps {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ErrorLogDetailDialog({
  id,
  open,
  onOpenChange,
}: ErrorLogDetailDialogProps) {
  const router = useRouter();
  const { data } = useQuery(errorLogDetailOptions(id));

  const handleFingerprintFilter = () => {
    if (!data?.fingerprint) return;
    const params = new URLSearchParams();
    params.set('search', data.message.slice(0, 50));
    params.set('groupByFingerprint', 'true');
    router.push(`/error-logs?${params.toString()}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>에러 로그 상세</DialogTitle>
          <DialogDescription>
            에러 발생 시점의 전체 컨텍스트를 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        {!data ? (
          <p className="text-sm text-muted-foreground">로드 중...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ErrorLevelBadge level={data.level} />
              <ErrorSourceBadge source={data.source} />
              {data.isResolved ? (
                <Badge variant="outline">해결됨</Badge>
              ) : (
                <Badge variant="secondary">미해결</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {format(new Date(data.createdAt), 'yyyy-MM-dd HH:mm:ss')}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">메시지</h3>
              <p className="text-sm whitespace-pre-wrap">{data.message}</p>
            </div>

            {data.stack && (
              <div>
                <h3 className="text-sm font-semibold mb-1">스택 트레이스</h3>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
                  {data.stack}
                </pre>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-2">요청 컨텍스트</h3>
              <dl className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                <dt className="text-muted-foreground">URL</dt>
                <dd className="font-mono text-xs break-all">
                  {data.url ?? '-'}
                </dd>
                <dt className="text-muted-foreground">Method</dt>
                <dd>{data.method ?? '-'}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{data.statusCode ?? '-'}</dd>
                <dt className="text-muted-foreground">User Agent</dt>
                <dd className="text-xs break-all">{data.userAgent ?? '-'}</dd>
                <dt className="text-muted-foreground">IP</dt>
                <dd className="font-mono text-xs">{data.ipAddress ?? '-'}</dd>
                <dt className="text-muted-foreground">Referer</dt>
                <dd className="text-xs break-all">{data.referer ?? '-'}</dd>
              </dl>
            </div>

            {data.metadata !== null && data.metadata !== undefined && (
              <div>
                <h3 className="text-sm font-semibold mb-1">메타데이터</h3>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(data.metadata, null, 2)}
                </pre>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-2">식별자</h3>
              <dl className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                <dt className="text-muted-foreground">Digest</dt>
                <dd className="font-mono text-xs">{data.digest ?? '-'}</dd>
                <dt className="text-muted-foreground">Fingerprint</dt>
                <dd className="font-mono text-xs flex items-center gap-2">
                  {data.fingerprint ?? '-'}
                  {data.fingerprint && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={handleFingerprintFilter}
                    >
                      같은 에러 보기
                    </Button>
                  )}
                </dd>
              </dl>
            </div>

            {data.isResolved && (
              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                <p>
                  해결자:{' '}
                  <strong>{data.resolvedByName ?? data.resolvedBy ?? '-'}</strong>
                  {data.resolvedAt && (
                    <>
                      {' · '}
                      {format(new Date(data.resolvedAt), 'yyyy-MM-dd HH:mm')}
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <ResolveErrorLogButton
                id={data.id}
                isResolved={data.isResolved}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
