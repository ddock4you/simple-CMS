'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { navigationKeys } from '@/shared/api/queryKeys';
import { useStagedOrder } from '@/shared/lib/useStagedOrder';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { Button } from '@/shared/ui/shadcn/button';
import { OrderActionButtons } from '@/shared/ui/OrderActionButtons';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';

import type { MenuItemNode } from '../model/navigationFilters';
import type { CreateMenuItemData, UpdateMenuItemData } from '../model/navigationSchemas';
import {
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useReorderItems,
} from '../api/useNavigationMutations';
import { SortableMenuItem } from './SortableMenuItem';
import { MenuItemDialog } from './MenuItemDialog';

interface MenuItemTreeProps {
  menuId: string;
  items: MenuItemNode[];
}

export function MenuItemTree({ menuId, items: propItems }: MenuItemTreeProps) {
  const canCreate = usePermission('navigation', 'create');
  const canUpdate = usePermission('navigation', 'update');
  const canDelete = usePermission('navigation', 'delete');

  const queryClient = useQueryClient();
  const createMutation = useCreateMenuItem(menuId);
  const updateMutation = useUpdateMenuItem(menuId);
  const deleteMutation = useDeleteMenuItem(menuId);
  const reorderMutation = useReorderItems(menuId);

  const { items, isDirty, dirtyCount, applyTreeDragEnd, getDirtyPayload, reset } =
    useStagedOrder({
      data: propItems,
      mode: 'tree',
      getId: (n) => n.id,
      getOrder: (n) => n.displayOrder,
      getChildren: (n) => n.children,
      setChildren: (n, children) => ({ ...n, children }),
    });

  const { confirmDialogProps } = useDirtyGuard(isDirty && canUpdate);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogParentId, setDialogParentId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<MenuItemNode | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Only reorder within same parent
      const activeParent = findParentId(items, String(active.id));
      const overParent = findParentId(items, String(over.id));
      if (activeParent !== overParent) return;

      applyTreeDragEnd({
        parentId: activeParent,
        activeId: String(active.id),
        overId: String(over.id),
      });
    },
    [items, applyTreeDragEnd],
  );

  const handleSave = () => {
    reorderMutation.mutate(
      { items: getDirtyPayload() },
      {
        onSuccess: () => {
          toast.success('순서가 저장되었습니다.');
          void queryClient.invalidateQueries({ queryKey: navigationKeys.detail(menuId) }).then(() => reset());
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  const handleAddRoot = () => {
    setEditItem(null);
    setDialogParentId(null);
    setDialogOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditItem(null);
    setDialogParentId(parentId);
    setDialogOpen(true);
  };

  const handleEdit = (item: MenuItemNode) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (itemId: string) => {
    deleteMutation.mutate(itemId);
  };

  const handleToggleVisibility = (item: MenuItemNode) => {
    updateMutation.mutate({
      itemId: item.id,
      data: { isVisible: !item.isVisible },
    });
  };

  const handleDialogSubmit = (data: CreateMenuItemData) => {
    if (editItem) {
      const updateData: UpdateMenuItemData = {
        label: data.label,
        itemType: data.itemType,
        subpageId: data.subpageId,
        boardId: data.boardId,
        url: data.url,
        isVisible: data.isVisible,
        openInNewTab: data.openInNewTab,
        startDate: data.startDate,
        endDate: data.endDate,
      };
      updateMutation.mutate(
        { itemId: editItem.id, data: updateData },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const rootIds = items.map((i) => i.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">메뉴 항목</h3>
        <div className="flex items-center gap-2">
          {canUpdate && (
            <OrderActionButtons
              dirtyCount={dirtyCount}
              isSaving={reorderMutation.isPending}
              onReset={reset}
              onSave={handleSave}
            />
          )}
          {canCreate && (
            <Button variant="outline" size="sm" onClick={handleAddRoot}>
              <Plus className="size-4" />
              항목 추가
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          메뉴 항목이 없습니다. 항목을 추가해주세요.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-2">
            <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <div key={item.id}>
                  <SortableMenuItem
                    item={item}
                    depth={0}
                    canCreate={canCreate}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleVisibility={handleToggleVisibility}
                    onAddChild={handleAddChild}
                  />
                  {item.children.length > 0 && (
                    <SortableContext
                      items={item.children.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="mt-1 space-y-1">
                        {item.children.map((child) => (
                          <div key={child.id}>
                            <SortableMenuItem
                              item={child}
                              depth={1}
                              canCreate={canCreate}
                              canUpdate={canUpdate}
                              canDelete={canDelete}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onToggleVisibility={handleToggleVisibility}
                              onAddChild={handleAddChild}
                            />
                            {child.children.length > 0 && (
                              <SortableContext
                                items={child.children.map((gc) => gc.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="mt-1 space-y-1">
                                  {child.children.map((grandchild) => (
                                    <SortableMenuItem
                                      key={grandchild.id}
                                      item={grandchild}
                                      depth={2}
                                      canCreate={false}
                                      canUpdate={canUpdate}
                                      canDelete={canDelete}
                                      onEdit={handleEdit}
                                      onDelete={handleDelete}
                                      onToggleVisibility={handleToggleVisibility}
                                      onAddChild={() => {}}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            )}
                          </div>
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              ))}
            </SortableContext>
          </div>
        </DndContext>
      )}

      <MenuItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleDialogSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        parentId={dialogParentId}
        editItem={editItem}
      />

      <ConfirmLeaveDialog {...confirmDialogProps} />
    </div>
  );
}

// Helper: find parent ID of an item
function findParentId(items: MenuItemNode[], id: string): string | null {
  for (const item of items) {
    if (item.children.some((c) => c.id === id)) return item.id;
    const found = findParentId(item.children, id);
    if (found !== undefined) return found;
  }
  return null;
}
