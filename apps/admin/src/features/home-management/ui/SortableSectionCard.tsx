'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Pencil } from 'lucide-react';

import { Button } from '@/shared/ui/Button';

import {
  SECTION_TYPE_DESCRIPTIONS,
  SECTION_TYPE_LABELS,
} from '../model/sectionLabels';
import type { HomeSectionListItem } from '../model/home.types';
import { SectionTypeBadge } from './SectionTypeBadge';

interface SortableSectionCardProps {
  section: HomeSectionListItem;
  canUpdate: boolean;
  onEdit: (section: HomeSectionListItem) => void;
  onToggleVisibility: (section: HomeSectionListItem) => void;
}

export function SortableSectionCard({
  section,
  canUpdate,
  onEdit,
  onToggleVisibility,
}: SortableSectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: !canUpdate });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
          <SectionTypeBadge sectionType={section.sectionType} />
          <span
            className={`truncate font-medium ${
              !section.isVisible ? 'text-muted-foreground line-through' : ''
            }`}
          >
            {SECTION_TYPE_LABELS[section.sectionType]}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {SECTION_TYPE_DESCRIPTIONS[section.sectionType]}
        </p>
        {section.title !== SECTION_TYPE_LABELS[section.sectionType] && (
          <p className="mt-1 text-xs text-muted-foreground">
            관리용 제목: {section.title}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {canUpdate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(section)}
            title={section.isVisible ? '숨기기' : '보이기'}
          >
            {section.isVisible ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4 text-muted-foreground" />
            )}
          </Button>
        )}
        {canUpdate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(section)}
            title="편집"
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
