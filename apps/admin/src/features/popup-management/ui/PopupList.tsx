'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { popupKeys } from '@/shared/api/queryKeys';
import { useStagedOrder } from '@/shared/lib/useStagedOrder';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { OrderActionButtons } from '@/shared/ui/OrderActionButtons';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';

import { homePopupListOptions } from '../api/popupQueries';
import { useReorderHomePopups } from '../api/usePopupMutations';

import { SortablePopupCard } from './SortablePopupCard';

export function PopupList() {
  const { data } = useQuery(homePopupListOptions());
  const reorder = useReorderHomePopups();
  const queryClient = useQueryClient();
  const canUpdate = usePermission('home-popups', 'update');

  const { items, isDirty, dirtyCount, applyDragEnd, getDirtyPayload, reset } =
    useStagedOrder({
      data: data ?? [],
      mode: 'list',
      getId: (p) => p.id,
      getOrder: (p) => p.displayOrder,
    });

  const { confirmDialogProps } = useDirtyGuard(isDirty && canUpdate);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      applyDragEnd(String(active.id), String(over.id));
    },
    [applyDragEnd],
  );

  const handleSave = () => {
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
  };

  if (!data) return null;

  if (data.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-12 text-center">
        <p className="text-muted-foreground">등록된 메인 팝업이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      {canUpdate && (
        <OrderActionButtons
          dirtyCount={dirtyCount}
          isSaving={reorder.isPending}
          onReset={reset}
          onSave={handleSave}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((popup) => (
              <SortablePopupCard
                key={popup.id}
                popup={popup}
                canUpdate={canUpdate}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <ConfirmLeaveDialog {...confirmDialogProps} />
    </>
  );
}
