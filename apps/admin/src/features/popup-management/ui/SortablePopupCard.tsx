'use client';

import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { GripVertical, Pencil } from 'lucide-react';

import type { HomePopupListItem } from '@simple-cms/types';

import { Button } from '@/shared/ui/shadcn/button';
import { InlineBooleanToggle } from '@/shared/ui/InlineBooleanToggle';

import { useToggleHomePopupVisibility } from '../api/usePopupMutations';
import { PopupTypeBadge } from './PopupTypeBadge';

interface Props {
  popup: HomePopupListItem;
  canUpdate: boolean;
}

export function SortablePopupCard({ popup, canUpdate }: Props) {
  const toggleVisibility = useToggleHomePopupVisibility();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: popup.id, disabled: !canUpdate });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const datePart = [
    popup.startDate
      ? format(new Date(popup.startDate), 'yyyy-MM-dd HH:mm')
      : '시작 제한 없음',
    popup.endDate
      ? format(new Date(popup.endDate), 'yyyy-MM-dd HH:mm')
      : '종료 제한 없음',
  ].join(' ~ ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-md border bg-background p-4"
    >
      {canUpdate && (
        <button
          type="button"
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="순서 변경"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PopupTypeBadge type={popup.popupType} />
          <Link
            href={`/home/popups/${popup.id}`}
            className={`truncate font-medium hover:underline ${
              !popup.isVisible ? 'text-muted-foreground line-through' : ''
            }`}
          >
            {popup.title}
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {datePart} · 순서 {popup.displayOrder + 1}
        </p>
      </div>

      <div
        className="flex shrink-0 items-center gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <InlineBooleanToggle
          value={popup.isVisible}
          onChange={(isVisible) =>
            toggleVisibility.mutate({ id: popup.id, isVisible })
          }
          disabled={!canUpdate}
          isPending={
            toggleVisibility.isPending &&
            toggleVisibility.variables?.id === popup.id
          }
          labelOn="노출"
          labelOff="숨김"
        />
        {canUpdate && (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={`/home/popups/${popup.id}/edit`} />}
            title="편집"
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
