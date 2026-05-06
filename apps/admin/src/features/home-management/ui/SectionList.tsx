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

import { updateHomeSection } from '../api/homeFetchers';
import type { HomeSectionListItem } from '../model/home.types';
import { SortableSectionCard } from './SortableSectionCard';
import { SectionEditDialog } from './SectionEditDialog';

interface SectionListProps {
  canUpdate: boolean;
  items: HomeSectionListItem[];
  applyDragEnd: (activeId: string, overId: string) => void;
}

export function SectionList({ canUpdate, items, applyDragEnd }: SectionListProps) {
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] =
    useState<HomeSectionListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    </>
  );
}
