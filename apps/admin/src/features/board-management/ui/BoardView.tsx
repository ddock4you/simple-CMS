'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import { boardDetailOptions } from '../api/boardQueries';
import { useDeleteBoard } from '../api/useBoardMutations';
import { BoardSkinTypeBadge } from './BoardSkinTypeBadge';
import { BoardVisibilityBadge } from './BoardVisibilityBadge';
import { DeleteBoardDialog } from './DeleteBoardDialog';

interface BoardViewProps {
  id: string;
}

export function BoardView({ id }: BoardViewProps) {
  const { data } = useQuery(boardDetailOptions(id));
  const deleteMutation = useDeleteBoard();
  const canUpdate = usePermission('boards', 'update');
  const canDelete = usePermission('boards', 'delete');

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/boards" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <BoardVisibilityBadge isPublic={data.isPublic} />
        </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <DeleteBoardDialog
              name={data.name}
              isPending={deleteMutation.isPending}
              onConfirm={() => deleteMutation.mutate(id)}
            />
          )}
          {canUpdate && (
            <Button
              nativeButton={false}
              render={<Link href={`/boards/${id}/edit`} />}
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
              <CardTitle>게시판 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono">/board/{data.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">스킨 타입</span>
                <BoardSkinTypeBadge skinType={data.skinType} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">공개 여부</span>
                <BoardVisibilityBadge isPublic={data.isPublic} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">게시글 수</span>
                <span>{data.postCount}건</span>
              </div>
              {data.description && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">설명</span>
                  <p className="mt-1">{data.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>날짜</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
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
