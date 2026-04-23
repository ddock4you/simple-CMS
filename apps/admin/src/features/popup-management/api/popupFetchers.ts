import type {
  HomePopupListItem,
  HomePopupDetail,
  CreateHomePopupDto,
  UpdateHomePopupDto,
  ReorderHomePopupsDto,
} from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';

export function getHomePopups(): Promise<HomePopupListItem[]> {
  return fetchClient<HomePopupListItem[]>('/api/home-popups');
}

export function getHomePopup(id: string): Promise<HomePopupDetail> {
  return fetchClient<HomePopupDetail>(`/api/home-popups/${id}`);
}

export function createHomePopup(
  data: CreateHomePopupDto,
): Promise<{ id: string }> {
  return fetchClient<{ id: string }>('/api/home-popups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateHomePopup(
  id: string,
  data: UpdateHomePopupDto,
): Promise<null> {
  return fetchClient<null>(`/api/home-popups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteHomePopup(id: string): Promise<null> {
  return fetchClient<null>(`/api/home-popups/${id}`, { method: 'DELETE' });
}

export function reorderHomePopups(data: ReorderHomePopupsDto): Promise<null> {
  return fetchClient<null>('/api/home-popups/reorder', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function toggleHomePopupVisibility(
  id: string,
  isVisible: boolean,
): Promise<null> {
  return fetchClient<null>(`/api/home-popups/${id}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ isVisible }),
  });
}
