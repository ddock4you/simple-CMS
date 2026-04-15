/**
 * 서브페이지 블록 DTO (admin API 계약, Stage 6)
 */

import type { PageBlockType } from '../domain/block.types';

export interface PageBlockListItem {
  id: string;
  subpageId: string;
  blockType: PageBlockType;
  /** 클라이언트는 blockType별 discriminated union으로 좁혀서 사용 */
  configJson: unknown;
  isVisible: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageBlockDetail extends PageBlockListItem {}

export interface CreatePageBlockDto {
  blockType: PageBlockType;
  configJson: unknown;
  isVisible?: boolean;
}

/**
 * blockType은 수정 불가 (타입 전환 필요 시 삭제 + 재생성).
 * displayOrder는 reorder API 전담.
 */
export interface UpdatePageBlockDto {
  configJson?: unknown;
  isVisible?: boolean;
}

export interface ReorderPageBlocksDto {
  blocks: Array<{
    id: string;
    displayOrder: number;
  }>;
}
