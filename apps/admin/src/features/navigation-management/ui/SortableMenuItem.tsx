'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Pencil, Trash2, Plus, ExternalLink } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';

import type { MenuItemNode } from '../model/navigationFilters';
import { MenuItemTypeBadge } from './MenuItemTypeBadge';

interface SortableMenuItemProps {
  item: MenuItemNode;
  depth: number;
  canUpdate: boolean;
  canDelete: boolean;
  canCreate: boolean;
  onEdit: (item: MenuItemNode) => void;
  onDelete: (itemId: string) => void;
  onToggleVisibility: (item: MenuItemNode) => void;
  onAddChild: (parentId: string) => void;
}

export function SortableMenuItem({
  item,
  depth,
  canUpdate,
  canDelete,
  canCreate,
  onEdit,
  onDelete,
  onToggleVisibility,
  onAddChild,
}: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border bg-background p-3 ${
        depth === 1 ? 'ml-8' : depth >= 2 ? 'ml-16' : ''
      }`}
    >
      {canUpdate && (
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${!item.isVisible ? 'text-muted-foreground line-through' : ''}`}>
            {item.label}
          </span>
          <MenuItemTypeBadge itemType={item.itemType} />
          {item.openInNewTab && (
            <ExternalLink className="size-3 text-muted-foreground" />
          )}
        </div>
        {(item.url || item.subpageName || item.boardName) && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {item.subpageName && `서브 페이지: ${item.subpageName}`}
            {item.boardName && `게시판: ${item.boardName}`}
            {item.url && item.url}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {canUpdate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(item)}
            title={item.isVisible ? '숨기기' : '보이기'}
          >
            {item.isVisible ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4 text-muted-foreground" />
            )}
          </Button>
        )}
        {canCreate && depth < 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddChild(item.id)}
            title="하위 항목 추가"
          >
            <Plus className="size-4" />
          </Button>
        )}
        {canUpdate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            title="편집"
          >
            <Pencil className="size-4" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
            title="삭제"
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
