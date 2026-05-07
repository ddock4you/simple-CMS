'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { popupKeys } from '@/shared/api/queryKeys';
import { useStagedOrder } from '@/shared/lib/useStagedOrder';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { Button } from '@/shared/ui/Button';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { OrderActionButtons } from '@/shared/ui/OrderActionButtons';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';

import { homePopupListOptions } from '../api/popupQueries';
import { useReorderHomePopups } from '../api/usePopupMutations';
import { PopupList } from './PopupList';

interface PopupListClientProps {
  canCreate: boolean;
  canUpdate: boolean;
}

export function PopupListClient({ canCreate, canUpdate }: PopupListClientProps) {
  const queryClient = useQueryClient();
  const { data } = useQuery(homePopupListOptions());
  const reorder = useReorderHomePopups();

  const { items, isDirty, dirtyCount, applyDragEnd, getDirtyPayload, reset } =
    useStagedOrder({
      data: data ?? [],
      mode: 'list',
      getId: (p) => p.id,
      getOrder: (p) => p.displayOrder,
    });

  const { confirmDialogProps } = useDirtyGuard(isDirty && canUpdate);

  const handleSave = useCallback(() => {
    reorder.mutate(
      { popups: getDirtyPayload() },
      {
        onSuccess: () => {
          toast.success('순서가 저장되었습니다.');
          void queryClient.invalidateQueries({ queryKey: popupKeys.all }).then(() => reset());
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }, [reorder, getDirtyPayload, queryClient, reset]);

  return (
    <>
      <PageToolbar
        right={
          <>
            {canUpdate && (
              <OrderActionButtons
                dirtyCount={dirtyCount}
                isSaving={reorder.isPending}
                onReset={reset}
                onSave={handleSave}
              />
            )}
            {canCreate && (
              <Button nativeButton={false} render={<Link href="/popups/new" />}>
                <Plus className="size-4" />
                새 팝업
              </Button>
            )}
          </>
        }
        mobileCollapseRight={false}
      />
      <PopupList
        canUpdate={canUpdate}
        items={items}
        applyDragEnd={applyDragEnd}
      />
      <ConfirmLeaveDialog {...confirmDialogProps} />
    </>
  );
}
