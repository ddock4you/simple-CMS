'use client';

import type { BulkDeleteMediaResponse } from '@simple-cms/types';

import { BulkDeleteDialog } from '@/shared/ui/BulkDeleteDialog';

import { useBulkDeleteMedia } from '../api/useMediaMutations';

interface BulkDeleteMediaDialogProps {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 모든 처리 후(삭제 + blocked 확인) 호출. 선택 해제 등 호출자 정리용 */
  onCompleted?: (result: BulkDeleteMediaResponse) => void;
}

export function BulkDeleteMediaDialog({ ids, open, onOpenChange, onCompleted }: BulkDeleteMediaDialogProps) {
  return (
    <BulkDeleteDialog
      ids={ids}
      open={open}
      onOpenChange={onOpenChange}
      onCompleted={onCompleted}
      title="미디어 일괄 삭제"
      confirmDescription={`선택한 ${ids.length}개 미디어를 삭제하시겠습니까? 사용 중인 미디어는 자동으로 제외됩니다.`}
      blockedListLabel="사용 중인 미디어"
      resultDescription={(result) =>
        `${result.deleted.length}개 삭제 완료, ${result.blocked.length}개는 사용 중이라 제외되었습니다.`
      }
      renderBlockedItem={(item) => (
        <>
          <p className="font-medium">{item.originalFilename}</p>
          <ul className="pl-3 text-xs text-muted-foreground">
            {item.references.map((ref) => (
              <li key={`${ref.type}-${ref.entityId}`}>
                · {ref.label}
                {ref.context && <span className="ml-1">— {ref.context}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      useDeleteHook={useBulkDeleteMedia}
    />
  );
}
