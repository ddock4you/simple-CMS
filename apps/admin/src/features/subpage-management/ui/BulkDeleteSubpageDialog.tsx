'use client';

import type { BulkDeleteSubpageResponse } from '../api/subpageFetchers';
import { useBulkDeleteSubpages } from '../api/useSubpageMutations';

import { BulkDeleteDialog } from '@/shared/ui/BulkDeleteDialog';

interface Props {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (result: BulkDeleteSubpageResponse) => void;
}

export function BulkDeleteSubpageDialog({ ids, open, onOpenChange, onCompleted }: Props) {
  return (
    <BulkDeleteDialog
      ids={ids}
      open={open}
      onOpenChange={onOpenChange}
      onCompleted={onCompleted}
      title="서브 페이지 일괄 삭제"
      confirmDescription={`선택한 ${ids.length}개 서브 페이지를 삭제하시겠습니까? 메뉴 항목에서 참조 중인 서브 페이지는 자동으로 제외됩니다.`}
      blockedListLabel="참조 중인 서브 페이지"
      resultDescription={(result) =>
        `${result.deleted.length}개 삭제 완료, ${result.blocked.length}개는 참조 중이라 제외되었습니다.`
      }
      renderBlockedItem={(item) => (
        <>
          <p className="font-medium">{item.title}</p>
          <p className="pl-3 text-xs text-muted-foreground">· {item.reason}</p>
        </>
      )}
      useDeleteHook={useBulkDeleteSubpages}
    />
  );
}
