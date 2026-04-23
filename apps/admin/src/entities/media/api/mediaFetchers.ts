import type {
  ApiResponse,
  BulkDeleteMediaResponse,
  MediaDetail,
  MediaListFilters,
  MediaListResponse,
  MediaReferencesResponse,
  UpdateMediaDto,
  UploadMediaResponse,
} from '@simple-cms/types';

import { fetchClient, FetchError } from '@/shared/api/fetchClient';

import { buildMediaSearchParams } from '../model/mediaFilters';

export function getMediaList(
  filters: MediaListFilters,
): Promise<MediaListResponse> {
  const qs = buildMediaSearchParams(filters);
  return fetchClient<MediaListResponse>(`/api/media${qs ? `?${qs}` : ''}`);
}

export function getMediaDetail(id: string): Promise<MediaDetail> {
  return fetchClient<MediaDetail>(`/api/media/${id}`);
}

export function getMediaReferences(
  id: string,
): Promise<MediaReferencesResponse> {
  return fetchClient<MediaReferencesResponse>(`/api/media/${id}/references`);
}

export function updateMedia(id: string, data: UpdateMediaDto): Promise<null> {
  return fetchClient<null>(`/api/media/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteMedia(id: string): Promise<null> {
  return fetchClient<null>(`/api/media/${id}`, { method: 'DELETE' });
}

export function bulkDeleteMedia(
  ids: string[],
): Promise<BulkDeleteMediaResponse> {
  return fetchClient<BulkDeleteMediaResponse>('/api/media/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

/**
 * FormData multipart 업로드. fetchClient는 Content-Type을 강제하므로 직접 fetch.
 * 응답에 `reused: true`이면 기존 미디어 재사용 — 호출자가 토스트로 안내.
 *
 * `endpoint` (Stage 7l): 업로드 엔드포인트 override. 기본 `/api/media/upload`.
 * 브랜딩 업로드는 `/api/media/branding-upload` 전달 (SVG 차단 + ICO 허용).
 * 분리 엔드포인트 사유: 정책(허용 MIME) 분기를 클라이언트가 아니라 서버에서 명시적으로 표현.
 */
export async function uploadMedia(
  file: File,
  category: string = 'home',
  endpoint: string = '/api/media/upload',
): Promise<UploadMediaResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });
  const body = (await response.json()) as ApiResponse<UploadMediaResponse>;
  if (!response.ok || !body.success) {
    const message =
      'error' in body ? body.error : '업로드에 실패했습니다.';
    throw new FetchError(message, response.status);
  }
  return body.data;
}
