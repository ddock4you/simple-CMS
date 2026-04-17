'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ExternalLink, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Separator } from '@/shared/ui/shadcn/separator';
import { resolveMediaPreviewUrl } from '@/shared/lib/mediaUrl';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import {
  mediaDetailOptions,
  mediaReferencesOptions,
} from '@/entities/media/api/mediaQueries';
import { formatFileSize } from '@/entities/media/lib/formatFileSize';

import { useUpdateMedia } from '../api/useMediaMutations';
import { DeleteMediaDialog } from './DeleteMediaDialog';

interface MediaDetailDialogProps {
  mediaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaDetailDialog({
  mediaId,
  open,
  onOpenChange,
}: MediaDetailDialogProps) {
  const detailQuery = useQuery(mediaDetailOptions(mediaId));
  const referencesQuery = useQuery({
    ...mediaReferencesOptions(mediaId),
    enabled: !!mediaId && open,
  });
  const update = useUpdateMedia(mediaId ?? '');
  const canUpdate = usePermission('media', 'update');
  const canDelete = usePermission('media', 'delete');

  const [altDraft, setAltDraft] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    // 서버 데이터 로드/변경 시 폼 draft 동기화 — 외부 상태 동기화 effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAltDraft(detailQuery.data?.alt ?? '');
  }, [detailQuery.data?.alt]);

  const data = detailQuery.data;
  const isImage = data?.mimeType.startsWith('image/');
  const altChanged = data ? altDraft !== (data.alt ?? '') : false;

  const handleSaveAlt = () => {
    if (!mediaId || !altChanged) return;
    update.mutate({ alt: altDraft.trim() || null });
  };

  const refs = referencesQuery.data?.references ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>미디어 상세</DialogTitle>
            <DialogDescription>
              파일 정보 확인, 대체 텍스트 편집, 사용처 확인을 할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {!data ? (
            <p className="text-sm text-muted-foreground">로드 중...</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaPreviewUrl(data.url)}
                    alt={data.alt ?? data.originalFilename}
                    className="mx-auto max-h-80 object-contain"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    {data.mimeType}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">파일 정보</h3>
                <dl className="grid grid-cols-[110px_1fr] gap-y-1 text-sm">
                  <dt className="text-muted-foreground">원본 파일명</dt>
                  <dd className="break-all">{data.originalFilename}</dd>
                  <dt className="text-muted-foreground">저장 파일명</dt>
                  <dd className="break-all font-mono text-xs">
                    {data.filename}
                  </dd>
                  <dt className="text-muted-foreground">MIME</dt>
                  <dd>{data.mimeType}</dd>
                  <dt className="text-muted-foreground">크기</dt>
                  <dd>{formatFileSize(data.size)}</dd>
                  <dt className="text-muted-foreground">업로더</dt>
                  <dd>{data.uploadedBy?.name ?? '(삭제된 사용자)'}</dd>
                  <dt className="text-muted-foreground">업로드일</dt>
                  <dd>{format(new Date(data.createdAt), 'yyyy-MM-dd HH:mm')}</dd>
                  <dt className="text-muted-foreground">URL</dt>
                  <dd>
                    <a
                      href={data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      열기 <ExternalLink className="size-3" />
                    </a>
                  </dd>
                  <dt className="text-muted-foreground">SHA-256</dt>
                  <dd className="break-all font-mono text-xs">
                    {data.contentHash ?? '-'}
                  </dd>
                </dl>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="media-alt" className="text-sm font-semibold">
                  대체 텍스트 (alt)
                </Label>
                <Input
                  id="media-alt"
                  value={altDraft}
                  onChange={(e) => setAltDraft(e.target.value)}
                  placeholder="이미지 설명 (스크린리더, SEO용)"
                  disabled={!canUpdate}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveAlt}
                    disabled={!canUpdate || !altChanged || update.isPending}
                  >
                    {update.isPending ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  사용처 ({referencesQuery.data?.total ?? 0})
                </h3>
                {referencesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">조회 중...</p>
                ) : refs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    사용 중인 곳이 없습니다.
                  </p>
                ) : (
                  <ul className="rounded-md border bg-muted/30 p-2 text-sm">
                    {refs.map((r) => (
                      <li
                        key={`${r.type}-${r.entityId}`}
                        className="flex flex-col py-1 first:pt-0 last:pb-0"
                      >
                        <span className="font-medium">{r.label}</span>
                        {r.context && (
                          <span className="text-xs text-muted-foreground">
                            {r.context}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {canDelete && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-1 size-4" />
                    삭제
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteMediaDialog
        mediaId={mediaId}
        mediaName={data?.originalFilename ?? ''}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => onOpenChange(false)}
      />
    </>
  );
}
