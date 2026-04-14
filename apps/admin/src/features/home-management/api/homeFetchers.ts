import { fetchClient } from '@/shared/api/fetchClient';
import type {
  HomeSectionListItem,
  HomeSectionDetail,
  HomeReferencesDto,
  UpdateHomeSectionDto,
  ReorderHomeSectionsDto,
} from '../model/home.types';

export function getHomeSections(): Promise<HomeSectionListItem[]> {
  return fetchClient<HomeSectionListItem[]>('/api/home');
}

export function getHomeSection(id: string): Promise<HomeSectionDetail> {
  return fetchClient<HomeSectionDetail>(`/api/home/${id}`);
}

export function updateHomeSection(
  id: string,
  data: UpdateHomeSectionDto,
): Promise<null> {
  return fetchClient<null>(`/api/home/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function reorderHomeSections(
  data: ReorderHomeSectionsDto,
): Promise<null> {
  return fetchClient<null>('/api/home/reorder', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getHomeReferences(): Promise<HomeReferencesDto> {
  return fetchClient<HomeReferencesDto>('/api/home/references');
}
