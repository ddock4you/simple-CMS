'use client';

import { useCallback } from 'react';
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

import type { HomePopupListItem } from '@simple-cms/types';

import { SortablePopupCard } from './SortablePopupCard';

interface PopupListProps {
  canUpdate: boolean;
  items: HomePopupListItem[];
  applyDragEnd: (activeId: string, overId: string) => void;
}

export function PopupList({ canUpdate, items, applyDragEnd }: PopupListProps) {
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

  if (items.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-12 text-center">
        <p className="text-muted-foreground">등록된 메인 팝업이 없습니다.</p>
      </div>
    );
  }

  return (
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
  );
}
