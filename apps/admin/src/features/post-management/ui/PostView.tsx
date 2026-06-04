'use client';

import { AdminLink as Link } from '@/shared/ui/AdminLink';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import { renderTiptapContentForAdmin } from '@/shared/lib/renderContent';
import { resolveMediaPreviewUrl } from '@/shared/lib/mediaUrl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { getPostPublicUrl } from '@/shared/lib/siteUrl';

import { PreviewButton } from '@/entities/preview/ui/PreviewButton';
import { ViewLiveButton } from '@/entities/preview/ui/ViewLiveButton';

import { postDetailOptions } from '../api/postQueries';
import { useDeletePost } from '../api/usePostMutations';
import { ContentStatusBadge } from '@/entities/content-status/ui/StatusBadge';
import { Badge } from '@/shared/ui/Badge';
import { DeletePostDialog } from './DeletePostDialog';

interface PostViewProps {
  id: string;
}

export function PostView({ id }: PostViewProps) {
  const { data, isPending, isError, error } = useQuery(postDetailOptions(id));
  const deleteMutation = useDeletePost();
  const canUpdate = usePermission('posts', 'update');
  const canDelete = usePermission('posts', 'delete');

  if (isPending) {
    return <QueryStateMessage title="게시글 정보를 불러오는 중..." />;
  }

  if (isError || !data) {
    return (
      <QueryStateMessage
        title="게시글 정보를 불러오지 못했습니다."
        details={isError ? getQueryErrorMessage(error) : undefined}
        tone="destructive"
      />
    );
  }

  const contentHtml = renderTiptapContentForAdmin(data.contentJson);

  return (
    <div className="space-y-6">
      <PageHeader
        back={
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/posts" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
        }
        title={
          <span className="flex items-center gap-2">
            {data.title}
            {data.isImportant && <Badge variant="warning">중요</Badge>}
            <ContentStatusBadge status={data.status} />
          </span>
        }
      />
      <PageToolbar
        right={
          <>
            <PreviewButton entityType="POST" entityId={id} />
            {data.status === 'PUBLISHED' && (
              <ViewLiveButton
                url={getPostPublicUrl(data.boardSlug, data.slug)}
              />
            )}
            {canDelete && (
              <DeletePostDialog
                title={data.title}
                isPending={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate(id)}
              />
            )}
            {canUpdate && (
              <Button
                nativeButton={false}
                render={<Link href={`/posts/${id}/edit`} />}
              >
                <Pencil className="size-4" />
                편집
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>콘텐츠</CardTitle>
            </CardHeader>
            <CardContent>
              {contentHtml ? (
                <div
                  className="tiptap-content-view prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              ) : (
                <p className="text-muted-foreground">콘텐츠가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {data.featuredImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle>썸네일 이미지</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="overflow-hidden rounded-md border bg-muted">
                  {/* 외부 스토리지 URL도 가능하므로 next/image 대신 일반 img */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaPreviewUrl(data.featuredImageUrl)}
                    alt={data.featuredImageAlt ?? '게시글 썸네일'}
                    className="aspect-video w-full object-cover"
                  />
                </div>
                {data.featuredImageOriginalFilename && (
                  <p
                    className="truncate text-xs text-muted-foreground"
                    title={data.featuredImageOriginalFilename}
                  >
                    {data.featuredImageOriginalFilename}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">게시판</span>
                <Link
                  href={`/boards/${data.boardId}`}
                  className="hover:underline font-medium"
                >
                  {data.boardName}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono">/{data.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">상태</span>
                <ContentStatusBadge status={data.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">중요</span>
                <span>{data.isImportant ? '예' : '아니오'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">작성자</span>
                <span>{data.authorName ?? '-'}</span>
              </div>
              {data.publishedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">발행일</span>
                  <span>
                    {format(new Date(data.publishedAt), 'yyyy-MM-dd HH:mm')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">생성일</span>
                <span>
                  {format(new Date(data.createdAt), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">수정일</span>
                <span>
                  {format(new Date(data.updatedAt), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
            </CardContent>
          </Card>

          {(data.seoTitle || data.seoDescription) && (
            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {data.seoTitle && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">SEO 제목</span>
                    <p>{data.seoTitle}</p>
                  </div>
                )}
                {data.seoDescription && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">SEO 설명</span>
                    <p className="whitespace-pre-wrap">{data.seoDescription}</p>
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
