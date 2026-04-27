/**
 * SubpageVersion DTO (Stage 7m — 서브페이지 버전 관리).
 *
 * 감사 로그(`AuditLog`)가 "누가 언제 어떤 액션을"을 담당한다면 이 모델은
 * "그 시점의 콘텐츠가 정확히 무엇이었는가"를 담당한다. API 응답 DTO는 Prisma
 * generated 타입에 직접 의존하지 않고 이 파일의 인터페이스를 통해 전파된다.
 */

import type { CclType, SubpageContentStatus, SubpageVersionSource, SubpageVersionStatusStrategy } from '../domain/subpage.types';
import type { PageBlockType } from '../domain/block.types';

/**
 * 버전 스냅샷에 포함되는 Subpage 메타 필드 집합.
 * `publishedAt`은 롤백 시점에 재계산하므로 저장하지 않는다.
 */
export interface SubpageVersionSnapshotMeta {
  title: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  status: SubpageContentStatus;
  cclType: CclType | null;
  cclAi: boolean;
  feedbackEnabled: boolean;
  featuredImageId: string | null;
  displayOrder: number;
}

/**
 * 버전 스냅샷에 포함되는 단일 PageBlock 레코드.
 * `id`는 저장하지 않는다 — 롤백 시 새 cuid로 재생성된다.
 */
export interface SubpageVersionSnapshotBlock {
  blockType: PageBlockType;
  configJson: unknown;
  isVisible: boolean;
  displayOrder: number;
}

export interface SubpageVersionSnapshot {
  meta: SubpageVersionSnapshotMeta;
  blocks: SubpageVersionSnapshotBlock[];
}

export interface SubpageVersionAuthor {
  id: string;
  username: string;
  name: string;
}

/**
 * 버전 목록 행 — `label`은 원본 그대로 전달하고, truncate/parsing은 admin UI에서 수행한다.
 */
export interface SubpageVersionListItem {
  id: string;
  subpageId: string;
  createdAt: string;
  createdBy: SubpageVersionAuthor | null;
  label: string | null;
  sourceAction: SubpageVersionSource;
  isPinned: boolean;
}

/**
 * 버전 상세 — snapshot 전문 + dangling media id 목록 포함.
 */
export interface SubpageVersionDetail extends SubpageVersionListItem {
  snapshot: SubpageVersionSnapshot;
  danglingMediaIds: string[];
}

export interface SubpageVersionListResponse {
  items: SubpageVersionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SubpageVersionListFilters {
  authorIds?: string[];
  from?: string;
  to?: string;
  pinnedOnly?: boolean;
  sources?: SubpageVersionSource[];
  page?: number;
  pageSize?: number;
}

export interface CreateSubpageVersionDto {
  label?: string | null;
}

export interface RollbackSubpageVersionDto {
  expectedRevision: number;
  statusStrategy?: SubpageVersionStatusStrategy;
  acknowledgeDangling?: boolean;
}

export interface UpdateSubpageVersionDto {
  isPinned: boolean;
}

export const SUBPAGE_VERSION_RETENTION_LIMIT = 30;
export const SUBPAGE_VERSION_LABEL_MAX_LENGTH = 10_000;
export const SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT = 72;
