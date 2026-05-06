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
import { renderTiptapContentForAdmin } from '@/shared/lib/renderContent';
import { resolveMediaPreviewUrl } from '@/shared/lib/mediaUrl';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import { homePopupDetailOptions } from '../api/popupQueries';
import { useDeleteHomePopup } from '../api/usePopupMutations';

import { DeletePopupDialog } from './DeletePopupDialog';
import { PopupTypeBadge } from './PopupTypeBadge';

export function PopupView({ id }: { id: string }) {
  const { data } = useQuery(homePopupDetailOptions(id));
  const deleteMutation = useDeleteHomePopup();
  const canUpdate = usePermission('home-popups', 'update');
  const canDelete = usePermission('home-popups', 'delete');

  if (!data) return null;

  const contentHtml =
    data.popupType === 'CONTENT'
      ? renderTiptapContentForAdmin(data.contentJson)
      : '';

  return (
    <div className="space-y-6">
      <PageHeader
        back={
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/popups" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
        }
        title={
          <span className="flex items-center gap-2">
            {data.title}
            <PopupTypeBadge type={data.popupType} />
            {!data.isVisible && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                숨김
              </span>
            )}
          </span>
        }
      />
      <PageToolbar
        right={
          <>
            {canDelete && (
              <DeletePopupDialog
                title={data.title}
                isPending={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate(id)}
              />
            )}
            {canUpdate && (
              <Button
                nativeButton={false}
                render={<Link href={`/popups/${id}/edit`} />}
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
              <CardTitle>내용</CardTitle>
            </CardHeader>
            <CardContent>
              {data.popupType === 'IMAGE' && data.imageUrl ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaPreviewUrl(data.imageUrl)}
                    alt={data.imageAlt ?? ''}
                    className="w-full max-w-md rounded-md border object-contain"
                  />
                  <p className="text-xs text-muted-foreground">
                    alt: {data.imageAlt || '(없음)'}
                  </p>
                </div>
              ) : data.popupType === 'CONTENT' && contentHtml ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              ) : (
                <p className="text-muted-foreground">내용이 없습니다.</p>
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
                <span className="text-muted-foreground">노출 여부</span>
                <span>{data.isVisible ? '노출' : '숨김'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">표시 순서</span>
                <span>{data.displayOrder + 1}</span>
              </div>
              {data.linkUrl && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">링크</span>
                  <span className="truncate" title={data.linkUrl}>
                    {data.linkUrl}
                  </span>
                </div>
              )}
              {data.buttonLabel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">버튼 라벨</span>
                  <span>{data.buttonLabel}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">시작일</span>
                <span>
                  {data.startDate
                    ? format(new Date(data.startDate), 'yyyy-MM-dd HH:mm')
                    : '제한 없음'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">종료일</span>
                <span>
                  {data.endDate
                    ? format(new Date(data.endDate), 'yyyy-MM-dd HH:mm')
                    : '제한 없음'}
                </span>
              </div>
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
        </div>
      </div>
    </div>
  );
}
