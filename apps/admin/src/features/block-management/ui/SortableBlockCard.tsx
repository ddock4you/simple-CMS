'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, Pencil } from 'lucide-react';

import type { PageBlockListItem } from '@simple-cms/types';

import { Button } from '@/shared/ui/Button';

import { BlockTypeBadge } from './BlockTypeBadge';

interface Props {
  block: PageBlockListItem;
  canUpdate: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isDeletePending: boolean;
}

/**
 * 블록 카드의 요약 텍스트를 타입별로 계산한다.
 */
function getBlockSummary(block: PageBlockListItem): string {
  const cfg = block.configJson as Record<string, unknown> | null;
  if (!cfg) return '';
  switch (block.blockType) {
    case 'RICH_TEXT': {
      // Tiptap JSON에서 텍스트만 대강 추출 (요약용, 실제 검색 인덱스는 별도 집계)
      const doc = cfg.contentJson as {
        content?: Array<{ content?: Array<{ text?: string }> }>;
      } | null;
      if (!doc?.content) return '';
      const text = doc.content
        .flatMap((p) => (p.content ?? []).map((n) => n.text ?? ''))
        .join(' ')
        .trim();
      return text.length > 60 ? text.slice(0, 60) + '…' : text;
    }
    case 'HTML': {
      const html = String(cfg.html ?? '').replace(/<[^>]*>/g, ' ').trim();
      return html.length > 60 ? html.slice(0, 60) + '…' : html;
    }
    case 'IMAGE':
      return String(cfg.imageAlt ?? cfg.imageUrl ?? '');
    case 'IFRAME':
      return String(cfg.title ?? cfg.src ?? '');
    case 'ACCORDION': {
      const heading = String(cfg.heading ?? '').trim();
      if (heading) return heading;
      const items = Array.isArray(cfg.items) ? cfg.items : [];
      const first = items[0] as { title?: unknown } | undefined;
      return String(first?.title ?? '').trim();
    }
    default:
      return '';
  }
}

export function SortableBlockCard({
  block,
  canUpdate,
  onEdit,
  onDelete,
  isDeletePending,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: !canUpdate });

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
          <BlockTypeBadge type={block.blockType} />
          <span
            className={`truncate text-sm ${
              !block.isVisible
                ? 'text-muted-foreground line-through'
                : 'text-foreground'
            }`}
          >
            {getBlockSummary(block) || '(내용 없음)'}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          순서 {block.displayOrder + 1}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span
          title={block.isVisible ? '노출 중' : '숨김'}
          className="inline-flex size-8 items-center justify-center"
        >
          {block.isVisible ? (
            <Eye className="size-4 text-muted-foreground" />
          ) : (
            <EyeOff className="size-4 text-muted-foreground" />
          )}
        </span>
        {canUpdate && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              title="편집"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeletePending}
              title="삭제"
              className="text-destructive hover:text-destructive"
            >
              삭제
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
