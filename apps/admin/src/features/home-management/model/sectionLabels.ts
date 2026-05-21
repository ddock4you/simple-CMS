import type { HomeSectionType } from './home.types';

export const SECTION_TYPE_LABELS: Record<HomeSectionType, string> = {
  HERO: '히어로',
  RECOMMENDED: '추천 콘텐츠',
  SUB_CAROUSEL: '서브 캐러셀',
  SHORTCUT: '바로가기',
  LATEST_POSTS: '최신 게시글',
  CTA: '콜투액션 (CTA)',
  NOTICE: '공지사항',
};

export const SECTION_TYPE_DESCRIPTIONS: Record<HomeSectionType, string> = {
  HERO: '메인 페이지 최상단 대표 영역 (큰 제목과 CTA 버튼)',
  RECOMMENDED: '운영자가 직접 선택한 추천 서브 페이지/게시글',
  SUB_CAROUSEL: '원형 썸네일과 카피로 구성된 감성 캐러셀 섹션',
  SHORTCUT: '바로가기 카드 모음 (내부/외부 링크)',
  LATEST_POSTS: '지정한 게시판의 최신 게시글을 자동 표시',
  CTA: '방문자 행동 유도 배너 (버튼 포함)',
  NOTICE: '공지사항 리스트 (제목/링크/날짜)',
};

export const SECTION_TYPE_ORDER: HomeSectionType[] = [
  'HERO',
  'SUB_CAROUSEL',
  'RECOMMENDED',
  'SHORTCUT',
  'LATEST_POSTS',
  'CTA',
  'NOTICE',
];
