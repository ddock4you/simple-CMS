'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/AlertDialog';

import { mediaReferencesOptions } from '@/entities/media/api/mediaQueries';

import { useDeleteMedia } from '../api/useMediaMutations';

interface DeleteMediaDialogProps {
  mediaId: string | null;
  mediaName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteMediaDialog({
  mediaId,
  mediaName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteMediaDialogProps) {
  const referencesQuery = useQuery({
    ...mediaReferencesOptions(mediaId),
    enabled: !!mediaId && open,
  });
  const deleteMedia = useDeleteMedia();

  const total = referencesQuery.data?.total ?? 0;
  const refs = referencesQuery.data?.references ?? [];
  const blocked = total > 0;

  const handleConfirm = () => {
    if (!mediaId || blocked) return;
    deleteMedia.mutate(mediaId, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted?.();
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>미디어 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{mediaName}&quot;을(를) 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>

        {referencesQuery.isLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            사용처 확인 중...
          </div>
        ) : blocked ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">
              이 미디어는 {total}곳에서 사용 중입니다. 먼저 사용처에서 제거해야
              삭제할 수 있습니다.
            </p>
            <ul className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
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
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            이 미디어는 어디에서도 사용 중이지 않습니다. 삭제 후 되돌릴 수
            없습니다.
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMedia.isPending}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={
              blocked || deleteMedia.isPending || referencesQuery.isLoading
            }
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMedia.isPending ? '삭제 중...' : '삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
