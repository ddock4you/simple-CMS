/**
 * Media DTO (admin API 계약)
 *
 * /api/media 라이브러리 + 업로드 + 참조 추적용 응답 계약.
 * 업로드는 SHA-256 해시 기반 중복 방지 — 동일 바이너리 재업로드 시 reused: true.
 */

export interface MediaListItem {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  alt: string | null;
  contentHash: string | null;
  uploadedById: string | null;
  uploadedBy: { id: string; name: string; username: string } | null;
  createdAt: string;
}

export interface MediaDetail extends MediaListItem {}

export interface MediaListFilters {
  q?: string;
  /** MIME prefix 또는 정확 일치 (예: "image", "image/png") */
  mimeType?: string;
  page?: number;
  pageSize?: number;
}

export interface MediaListResponse {
  items: MediaListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UpdateMediaDto {
  alt?: string | null;
}

/**
 * 업로드 응답.
 * `reused: true`이면 동일 바이너리가 이미 존재 → 새 파일 저장 없이 기존 레코드 반환.
 */
export interface UploadMediaResponse extends MediaListItem {
  reused: boolean;
}

/**
 * Media 참조 추적 결과.
 * 한 미디어가 여러 곳에서 사용될 수 있어 여러 레코드 반환 가능.
 */
export type MediaReferenceType =
  | 'SUBPAGE_FEATURED'
  | 'POST_FEATURED'
  | 'HOME_SECTION'
  | 'POST_CONTENT'
  | 'HOME_POPUP'
  | 'PAGE_BLOCK_IMAGE';

export interface MediaReference {
  type: MediaReferenceType;
  /** 참조 엔티티 ID (Subpage.id, Post.id, HomeSection.id 등) */
  entityId: string;
  /** 사람이 읽을 수 있는 라벨 (페이지 제목, 섹션명 등) */
  label: string;
  /** 보조 라벨 (게시판명, 섹션 타입 등). UI에서 부제로 표시 */
  context?: string;
}

export interface MediaReferencesResponse {
  total: number;
  references: MediaReference[];
}

/**
 * 일괄 삭제 응답.
 * - `deleted`: 성공적으로 삭제된 Media id 목록
 * - `blocked`: 참조가 있어 삭제되지 않은 항목 + 사용처 목록
 */
export interface BulkDeleteMediaResponse {
  deleted: string[];
  blocked: Array<{
    id: string;
    originalFilename: string;
    references: MediaReference[];
  }>;
}
