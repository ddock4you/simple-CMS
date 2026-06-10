import type { HomeSectionType } from '../domain/home.types';

/**
 * HomeSection DTO (admin API 계약)
 */

export interface HomeSectionListItem {
  id: string;
  sectionType: HomeSectionType;
  title: string;
  isVisible: boolean;
  displayOrder: number;
  configJson: unknown;
  updatedAt: string;
}

export interface HomeSectionDetail extends HomeSectionListItem {
  createdAt: string;
}

export interface UpdateHomeSectionDto {
  title?: string;
  isVisible?: boolean;
  configJson?: unknown;
}

export interface ReorderHomeSectionsDto {
  sections: Array<{
    id: string;
    displayOrder: number;
  }>;
}

/**
 * Edit Dialog의 드롭다운용 참조 데이터 묶음.
 * NOTICE / GALLERY_COLLECTION 게시판 선택 시 사용.
 */
export interface HomeReferencesDto {
  boards: Array<{ id: string; name: string }>;
}
