'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import { renderTiptapContentForAdmin } from '@/shared/lib/renderContent';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import { subpageDetailOptions } from '../api/subpageQueries';
import { useDeleteSubpage } from '../api/useSubpageMutations';
import { SubpageStatusBadge } from './SubpageStatusBadge';
import { DeleteSubpageDialog } from './DeleteSubpageDialog';

interface SubpageViewProps {
  id: string;
}

export function SubpageView({ id }: SubpageViewProps) {
  const { data } = useQuery(subpageDetailOptions(id));
  const deleteMutation = useDeleteSubpage();
  const canUpdate = usePermission('subpages', 'update');
  const canDelete = usePermission('subpages', 'delete');

  if (!data) return null;

  const contentHtml = renderTiptapContentForAdmin(data.contentJson);

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
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>콘텐츠</CardTitle>
            </CardHeader>
            <CardContent>
              {contentHtml ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              ) : (
                <p className="text-muted-foreground">콘텐츠가 없습니다.</p>
              )}
            </CardContent>
          </Card>
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
