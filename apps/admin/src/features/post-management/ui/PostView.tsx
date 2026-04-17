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
import { getPostPublicUrl } from '@/shared/lib/siteUrl';

import { PreviewButton } from '@/entities/preview/ui/PreviewButton';
import { ViewLiveButton } from '@/entities/preview/ui/ViewLiveButton';

import { postDetailOptions } from '../api/postQueries';
import { useDeletePost } from '../api/usePostMutations';
import { PostStatusBadge } from './PostStatusBadge';
import { DeletePostDialog } from './DeletePostDialog';

interface PostViewProps {
  id: string;
}

export function PostView({ id }: PostViewProps) {
  const { data } = useQuery(postDetailOptions(id));
  const deleteMutation = useDeletePost();
  const canUpdate = usePermission('posts', 'update');
  const canDelete = usePermission('posts', 'delete');

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
            render={<Link href="/posts" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <PostStatusBadge status={data.status} />
        </div>
        <div className="flex items-center gap-2">
          <PreviewButton entityType="POST" entityId={id} />
          {data.status === 'PUBLISHED' && (
            <ViewLiveButton url={getPostPublicUrl(data.boardSlug, data.slug)} />
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
                <PostStatusBadge status={data.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">작성자</span>
                <span>{data.authorName ?? '-'}</span>
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
        </div>
      </div>
    </div>
  );
}
