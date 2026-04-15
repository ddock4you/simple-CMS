'use client';

import { useState } from 'react';
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
import { Plus } from 'lucide-react';

import {
  PAGE_BLOCK_MAX_PER_SUBPAGE,
  type PageBlockListItem,
  type PageBlockType,
} from '@simple-cms/types';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';

import { blockListOptions } from '../api/blockQueries';
import {
  useDeleteBlock,
  useReorderBlocks,
} from '../api/useBlockMutations';
import {
  BLOCK_TYPE_DESCRIPTIONS,
  BLOCK_TYPE_LABELS,
} from '../model/blockLabels';
import { BlockEditDialog } from './BlockEditDialog';
import { SortableBlockCard } from './SortableBlockCard';

const BLOCK_TYPE_OPTIONS: PageBlockType[] = [
  'RICH_TEXT',
  'HTML',
  'IMAGE',
  'IFRAME',
];

export function BlockManager({ subpageId }: { subpageId: string }) {
  const canUpdate = usePermission('subpages', 'update');
  const { data = [] } = useQuery(blockListOptions(subpageId));

  const reorderMutation = useReorderBlocks(subpageId);
  const deleteMutation = useDeleteBlock(subpageId);

  const [creatingType, setCreatingType] = useState<PageBlockType | null>(null);
  const [editingBlock, setEditingBlock] = useState<PageBlockListItem | null>(
    null,
  );

  const dialogOpen = !!creatingType || !!editingBlock;
  const activeType = editingBlock?.blockType ?? creatingType;
  const atLimit = data.length >= PAGE_BLOCK_MAX_PER_SUBPAGE;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = data.findIndex((b) => b.id === active.id);
    const newIndex = data.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...data];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    reorderMutation.mutate({
      blocks: reordered.map((b, i) => ({ id: b.id, displayOrder: i })),
    });
  };

  const handleDelete = (blockId: string) => {
    if (!window.confirm('이 블록을 삭제하시겠습니까? 되돌릴 수 없습니다.')) {
      return;
    }
    deleteMutation.mutate(blockId);
  };

  const closeDialog = () => {
    setCreatingType(null);
    setEditingBlock(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">블록</h2>
          <p className="text-sm text-muted-foreground">
            본문 아래에 표시될 블록을 관리합니다. (현재 {data.length} /{' '}
            {PAGE_BLOCK_MAX_PER_SUBPAGE})
          </p>
        </div>
        {canUpdate && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button disabled={atLimit} title={atLimit ? '상한 도달' : undefined}>
                  <Plus className="size-4" />
                  블록 추가
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-[280px]">
              {BLOCK_TYPE_OPTIONS.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => setCreatingType(type)}
                  className="flex-col items-start"
                >
                  <span className="font-medium">{BLOCK_TYPE_LABELS[type]}</span>
                  <span className="text-xs text-muted-foreground">
                    {BLOCK_TYPE_DESCRIPTIONS[type]}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {atLimit && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          서브페이지당 블록은 최대 {PAGE_BLOCK_MAX_PER_SUBPAGE}개까지 추가할 수
          있습니다. 더 추가하려면 기존 블록을 삭제하세요.
        </div>
      )}

      {data.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            아직 블록이 없습니다.
            {canUpdate && ' 우측 상단의 "블록 추가"로 시작하세요.'}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={data.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {data.map((block) => (
                <SortableBlockCard
                  key={block.id}
                  block={block}
                  canUpdate={canUpdate}
                  onEdit={() => setEditingBlock(block)}
                  onDelete={() => handleDelete(block.id)}
                  isDeletePending={deleteMutation.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {dialogOpen && activeType && (
        <BlockEditDialog
          key={editingBlock ? `edit-${editingBlock.id}` : `create-${activeType}`}
          subpageId={subpageId}
          blockType={activeType}
          block={editingBlock}
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
        />
      )}
    </div>
  );
}
