import type { HomeSectionType } from './home.types';

export const SECTION_TYPE_LABELS: Record<HomeSectionType, string> = {
  HERO: '히어로',
  BRIEF_INTRO: '간략 소개',
  FREQUENT_MENU: '자주찾는 메뉴',
  NOTICE: '대표 게시판',
  GALLERY_COLLECTION: '갤러리 모아보기',
};

export const SECTION_TYPE_DESCRIPTIONS: Record<HomeSectionType, string> = {
  HERO: '메인 페이지 최상단 대표 영역 (큰 제목과 대표 버튼)',
  BRIEF_INTRO:
    '제목, 소개 문구, 선택 이미지와 자세히 보기 링크로 구성된 간략 소개 영역',
  FREQUENT_MENU: '아이콘과 링크로 구성된 자주찾는 메뉴 카드 모음',
  NOTICE: '선택한 게시판의 중요글과 최신글을 메인에 표시',
  GALLERY_COLLECTION:
    '여러 공개 게시판의 게시글을 탭과 갤러리 카드로 모아 표시',
};

export const SECTION_TYPE_ORDER: HomeSectionType[] = [
  'HERO',
  'BRIEF_INTRO',
  'FREQUENT_MENU',
  'GALLERY_COLLECTION',
  'NOTICE',
];
