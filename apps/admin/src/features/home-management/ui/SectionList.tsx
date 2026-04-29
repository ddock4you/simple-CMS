'use client';

import { useCallback, useState } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { FetchError } from '@/shared/api/fetchClient';
import { homeKeys } from '@/shared/api/queryKeys';
import { useStagedOrder } from '@/shared/lib/useStagedOrder';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { OrderActionButtons } from '@/shared/ui/OrderActionButtons';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';

import { useReorderHomeSections } from '../api/useHomeMutations';
import { updateHomeSection } from '../api/homeFetchers';
import type { HomeSectionListItem } from '../model/home.types';
import { SortableSectionCard } from './SortableSectionCard';
import { SectionEditDialog } from './SectionEditDialog';

interface SectionListProps {
  sections: HomeSectionListItem[];
  canUpdate: boolean;
}

export function SectionList({ sections, canUpdate }: SectionListProps) {
  const queryClient = useQueryClient();
  const reorderMutation = useReorderHomeSections();
  const [editingSection, setEditingSection] =
    useState<HomeSectionListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { items, isDirty, dirtyCount, applyDragEnd, getDirtyPayload, reset } =
    useStagedOrder({
      data: sections,
      mode: 'list',
      getId: (s) => s.id,
      getOrder: (s) => s.displayOrder,
    });

  const { confirmDialogProps } = useDirtyGuard(isDirty && canUpdate);

  // 섹션 수가 6개로 고정되지만, 토글은 단일 mutation에 id를 인자로 주입하여 hook 규칙 준수.
  const toggleMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      updateHomeSection(id, { isVisible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeKeys.all });
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });

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
    reorderMutation.mutate(
      { sections: getDirtyPayload() },
      {
        onSuccess: () => {
          reset();
          queryClient.invalidateQueries({ queryKey: homeKeys.all });
          toast.success('순서가 저장되었습니다.');
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  const handleEdit = (section: HomeSectionListItem) => {
    setEditingSection(section);
    setDialogOpen(true);
  };

  const handleToggleVisibility = (section: HomeSectionListItem) => {
    toggleMutation.mutate({
      id: section.id,
      isVisible: !section.isVisible,
    });
  };

  return (
    <>
      {canUpdate && (
        <OrderActionButtons
          dirtyCount={dirtyCount}
          isSaving={reorderMutation.isPending}
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
          items={items.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((section) => (
              <SortableSectionCard
                key={section.id}
                section={section}
                canUpdate={canUpdate}
                onEdit={handleEdit}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <SectionEditDialog
        section={editingSection}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingSection(null);
        }}
      />

      <ConfirmLeaveDialog {...confirmDialogProps} />
    </>
  );
}
