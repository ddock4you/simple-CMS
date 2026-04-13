'use client';

import { useState, useCallback } from 'react';
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

import { Button } from '@/shared/ui/shadcn/button';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

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

export function MenuItemTree({ menuId, items }: MenuItemTreeProps) {
  const canCreate = usePermission('navigation', 'create');
  const canUpdate = usePermission('navigation', 'update');
  const canDelete = usePermission('navigation', 'delete');

  const createMutation = useCreateMenuItem(menuId);
  const updateMutation = useUpdateMenuItem(menuId);
  const deleteMutation = useDeleteMenuItem(menuId);
  const reorderMutation = useReorderItems(menuId);

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

      // Find the parent group these items belong to
      const activeItem = findItem(items, String(active.id));
      const overItem = findItem(items, String(over.id));
      if (!activeItem || !overItem) return;

      // Only reorder within same parent
      const activeParent = findParentId(items, String(active.id));
      const overParent = findParentId(items, String(over.id));
      if (activeParent !== overParent) return;

      const siblings = activeParent === null
        ? items
        : findItem(items, activeParent)?.children ?? [];

      const oldIndex = siblings.findIndex((i) => i.id === active.id);
      const newIndex = siblings.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...siblings];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      reorderMutation.mutate({
        items: reordered.map((item, index) => ({
          id: item.id,
          displayOrder: index,
        })),
      });
    },
    [items, reorderMutation],
  );

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
        {canCreate && (
          <Button variant="outline" size="sm" onClick={handleAddRoot}>
            <Plus className="size-4" />
            항목 추가
          </Button>
        )}
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
    </div>
  );
}

// Helper: find item in tree
function findItem(items: MenuItemNode[], id: string): MenuItemNode | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findItem(item.children, id);
    if (found) return found;
  }
  return null;
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
