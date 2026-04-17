'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { getSubpagePublicUrl } from '@/shared/lib/siteUrl';

import { PreviewButton } from '@/entities/preview/ui/PreviewButton';
import { ViewLiveButton } from '@/entities/preview/ui/ViewLiveButton';

import { subpageDetailOptions } from '../api/subpageQueries';
import { useDeleteSubpage } from '../api/useSubpageMutations';
import { BlockContentView } from '@/features/block-management/ui/BlockContentView';
import { blockListOptions } from '@/features/block-management/api/blockQueries';
import { BLOCK_TYPE_LABELS } from '@/features/block-management/model/blockLabels';
import { SubpageStatusBadge } from './SubpageStatusBadge';
import { DeleteSubpageDialog } from './DeleteSubpageDialog';

interface SubpageViewProps {
  id: string;
}

export function SubpageView({ id }: SubpageViewProps) {
  const { data } = useQuery(subpageDetailOptions(id));
  const { data: blocks = [] } = useQuery(blockListOptions(id));
  const deleteMutation = useDeleteSubpage();
  const canUpdate = usePermission('subpages', 'update');
  const canDelete = usePermission('subpages', 'delete');

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/subpages" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <SubpageStatusBadge status={data.status} />
        </div>
        <div className="flex items-center gap-2">
          <PreviewButton entityType="SUBPAGE" entityId={id} />
          {data.status === 'PUBLISHED' && (
            <ViewLiveButton url={getSubpagePublicUrl(data.slug)} />
          )}
          {canDelete && (
            <DeleteSubpageDialog
              title={data.title}
              isPending={deleteMutation.isPending}
              onConfirm={() => deleteMutation.mutate(id)}
            />
          )}
          {canUpdate && (
            <Button
              nativeButton={false}
              render={<Link href={`/subpages/${id}/edit`} />}
            >
              <Pencil className="size-4" />
              편집
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>블록 구성 ({blocks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  아직 추가된 블록이 없습니다. 편집 화면에서 본문·HTML·이미지·iframe 블록을 자유롭게 섞을 수 있습니다.
                </p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {blocks.map((b, i) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-2"
                    >
                      <span className="w-6 text-right text-muted-foreground">
                        {i + 1}.
                      </span>
                      <span className="font-medium">
                        {BLOCK_TYPE_LABELS[b.blockType]}
                      </span>
                      {!b.isVisible && (
                        <span className="text-xs text-muted-foreground">
                          (숨김)
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {blocks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>콘텐츠</CardTitle>
              </CardHeader>
              <CardContent>
                <BlockContentView blocks={blocks} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono">/{data.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">상태</span>
                <SubpageStatusBadge status={data.status} />
              </div>
              {data.publishedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">발행일</span>
                  <span>{format(new Date(data.publishedAt), 'yyyy-MM-dd HH:mm')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">생성일</span>
                <span>{format(new Date(data.createdAt), 'yyyy-MM-dd HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">수정일</span>
                <span>{format(new Date(data.updatedAt), 'yyyy-MM-dd HH:mm')}</span>
              </div>
            </CardContent>
          </Card>

          {(data.seoTitle || data.seoDescription) && (
            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.seoTitle && (
                  <div>
                    <span className="text-muted-foreground">제목</span>
                    <p>{data.seoTitle}</p>
                  </div>
                )}
                {data.seoDescription && (
                  <div>
                    <span className="text-muted-foreground">설명</span>
                    <p>{data.seoDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
