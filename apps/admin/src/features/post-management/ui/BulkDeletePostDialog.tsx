'use client';

import type { BulkDeletePostResponse } from '../api/postFetchers';
import { useBulkDeletePosts } from '../api/usePostMutations';

import { BulkDeleteDialog } from '@/shared/ui/BulkDeleteDialog';

interface Props {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (result: BulkDeletePostResponse) => void;
}

export function BulkDeletePostDialog({ ids, open, onOpenChange, onCompleted }: Props) {
  return (
    <BulkDeleteDialog
      ids={ids}
      open={open}
      onOpenChange={onOpenChange}
      onCompleted={onCompleted}
      title="게시글 일괄 삭제"
      confirmDescription={`선택한 ${ids.length}개 게시글을 삭제하시겠습니까?`}
      blockedListLabel="실패한 게시글"
      resultDescription={(result) =>
        `${result.deleted.length}개 삭제, ${result.blocked.length}개 실패`
      }
      renderBlockedItem={(item) => (
        <>
          <p className="font-medium">{item.title}</p>
          <p className="pl-3 text-xs text-muted-foreground">· {item.reason}</p>
        </>
      )}
      useDeleteHook={useBulkDeletePosts}
    />
  );
}
