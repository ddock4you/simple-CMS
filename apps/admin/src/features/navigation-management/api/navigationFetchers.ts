import type { PaginatedResponse } from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';
import type {
  MenuSetListItem,
  MenuSetDetail,
  SubpageOption,
  BoardOption,
} from '../model/navigationFilters';
import type {
  CreateMenuData,
  UpdateMenuData,
  CreateMenuItemData,
  UpdateMenuItemData,
  ReorderItemsData,
} from '../model/navigationSchemas';

// Menu set operations
export function getMenuSetList(): Promise<MenuSetListItem[]> {
  return fetchClient<MenuSetListItem[]>('/api/navigation');
}

export function getMenuSetDetail(menuId: string): Promise<MenuSetDetail> {
  return fetchClient<MenuSetDetail>(`/api/navigation/${menuId}`);
}

export function createMenuSet(data: CreateMenuData): Promise<{ id: string }> {
  return fetchClient<{ id: string }>('/api/navigation', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateMenuSet(menuId: string, data: UpdateMenuData): Promise<null> {
  return fetchClient<null>(`/api/navigation/${menuId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteMenuSet(menuId: string): Promise<null> {
  return fetchClient<null>(`/api/navigation/${menuId}`, { method: 'DELETE' });
}

// Menu item operations
export function createMenuItem(menuId: string, data: CreateMenuItemData): Promise<{ id: string }> {
  return fetchClient<{ id: string }>(`/api/navigation/${menuId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateMenuItem(menuId: string, itemId: string, data: UpdateMenuItemData): Promise<null> {
  return fetchClient<null>(`/api/navigation/${menuId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteMenuItem(menuId: string, itemId: string): Promise<null> {
  return fetchClient<null>(`/api/navigation/${menuId}/items/${itemId}`, { method: 'DELETE' });
}

export function reorderItems(menuId: string, data: ReorderItemsData): Promise<null> {
  return fetchClient<null>(`/api/navigation/${menuId}/reorder`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Entity options for item type selectors
export async function getSubpageOptions(): Promise<SubpageOption[]> {
  const data = await fetchClient<PaginatedResponse<{ id: string; title: string }>>(
    '/api/subpages?pageSize=100',
  );
  return data.items.map((s) => ({ id: s.id, title: s.title }));
}

export async function getBoardOptions(): Promise<BoardOption[]> {
  const data = await fetchClient<PaginatedResponse<{ id: string; name: string }>>(
    '/api/boards?pageSize=100',
  );
  return data.items.map((b) => ({ id: b.id, name: b.name }));
}
