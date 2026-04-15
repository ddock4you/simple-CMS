'use client';

import { useQuery } from '@tanstack/react-query';
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

import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import { homePopupListOptions } from '../api/popupQueries';
import { useReorderHomePopups } from '../api/usePopupMutations';

import { SortablePopupCard } from './SortablePopupCard';

export function PopupList() {
  const { data } = useQuery(homePopupListOptions());
  const reorder = useReorderHomePopups();
  const canUpdate = usePermission('home-popups', 'update');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!data) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = data.findIndex((p) => p.id === active.id);
    const newIndex = data.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...data];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    reorder.mutate({
      popups: reordered.map((p, i) => ({ id: p.id, displayOrder: i })),
    });
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={data.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {data.map((popup) => (
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
