'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { FetchError } from '@/shared/api/fetchClient';
import { navigationKeys } from '@/shared/api/queryKeys';
import type {
  CreateMenuData,
  UpdateMenuData,
  CreateMenuItemData,
  UpdateMenuItemData,
  ReorderItemsData,
} from '../model/navigationSchemas';
import type { MenuSetDetail } from '../model/navigationFilters';
import {
  createMenuSet,
  updateMenuSet,
  deleteMenuSet,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderItems,
} from './navigationFetchers';

// Menu set mutations
export function useCreateMenuSet() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMenuData) => createMenuSet(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: navigationKeys.lists() });
      toast.success('메뉴가 생성되었습니다.');
      router.push(`/navigation/${result.id}`);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMenuSet(menuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMenuData) => updateMenuSet(menuId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: navigationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: navigationKeys.detail(menuId) });
      toast.success('메뉴가 수정되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMenuSet() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (menuId: string) => deleteMenuSet(menuId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: navigationKeys.lists() });
      toast.success('메뉴가 삭제되었습니다.');
      router.push('/navigation');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

// Menu item mutations
export function useCreateMenuItem(menuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMenuItemData) => createMenuItem(menuId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: navigationKeys.detail(menuId) });
      queryClient.invalidateQueries({ queryKey: navigationKeys.lists() });
      toast.success('메뉴 항목이 추가되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMenuItem(menuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateMenuItemData }) =>
      updateMenuItem(menuId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: navigationKeys.detail(menuId) });
      toast.success('메뉴 항목이 수정되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMenuItem(menuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteMenuItem(menuId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: navigationKeys.detail(menuId) });
      queryClient.invalidateQueries({ queryKey: navigationKeys.lists() });
      toast.success('메뉴 항목이 삭제되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

function applyReorderToTree(
  nodes: Array<{ id: string; displayOrder: number; children: Array<{ id: string; displayOrder: number; children: any[] }> }>,
  orderMap: Map<string, number>,
): typeof nodes {
  return nodes
    .map((node) => ({
      ...node,
      displayOrder: orderMap.get(node.id) ?? node.displayOrder,
      children: applyReorderToTree(node.children, orderMap),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function useReorderItems(menuId: string) {
  const queryClient = useQueryClient();
  const queryKey = navigationKeys.detail(menuId);

  return useMutation({
    mutationFn: (data: ReorderItemsData) => reorderItems(menuId, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<MenuSetDetail>(queryKey);
      if (previousData) {
        const orderMap = new Map(
          variables.items.map(({ id, displayOrder }) => [id, displayOrder]),
        );
        queryClient.setQueryData(queryKey, {
          ...previousData,
          items: applyReorderToTree(previousData.items, orderMap),
        });
      }
      return { previousData };
    },
    onError: (error: FetchError, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
