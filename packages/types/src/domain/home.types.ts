/**
 * HomeSection 도메인 타입
 *
 * 공개 웹 메인 페이지는 섹션 기반 랜딩 페이지. 고정 타입 섹션을
 * 운영자가 admin에서 관리한다. 섹션 추가/삭제는 불가, 편집/노출/순서만 관리.
 */

export type HomeSectionType =
  | 'HERO'
  | 'BRIEF_INTRO'
  | 'FREQUENT_MENU'
  | 'NOTICE'
  | 'GALLERY_COLLECTION';

export interface HomeSectionButton {
  label: string;
  url: string;
}

/**
 * 슬라이드 옵션 (HERO).
 * showPlayPause가 false면 autoPlay/autoPlayInterval은 무시된다.
 */
export interface SlideOptions {
  showPrevNext: boolean;
  showPlayPause: boolean;
  showDots: boolean;
  autoPlay: boolean;
  /** 자동재생 전환 간격 (ms). 최소 1000, 최대 30000 권장 */
  autoPlayInterval: number;
}

/**
 * 히어로 슬라이드 아이템. url이 있으면 전체 슬라이드가 링크로 동작.
 * imageOriginalName은 admin 관리용 (업로드 시 원본 파일명 보존).
 * mediaId는 Media 라이브러리 참조 — 미디어 삭제 시 사용처 추적용 (Stage 5a-2).
 */
export interface HeroSlide {
  imageUrl: string;
  imageAlt: string;
  title: string;
  description?: string | null;
  url?: string | null;
  imageOriginalName?: string | null;
  mediaId?: string | null;
}

export interface HeroConfig {
  slides: HeroSlide[];
  slideOptions: SlideOptions;
}

export interface BriefIntroConfig {
  heading: string;
  content: string;
  detailEnabled: boolean;
  detailUrl?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageOriginalName?: string | null;
  mediaId?: string | null;
}

export type FrequentMenuItemType = 'SUBPAGE' | 'BOARD' | 'EXTERNAL' | 'CUSTOM';

export interface FrequentMenuItem {
  title: string;
  itemType: FrequentMenuItemType;
  subpageId?: string | null;
  boardId?: string | null;
  url?: string | null;
  isVisible: boolean;
  openInNewTab: boolean;
  iconUrl: string;
  iconAlt: string;
  iconMediaId?: string | null;
  iconOriginalName?: string | null;
}

export interface FrequentMenuConfig {
  heading: string;
  items: FrequentMenuItem[];
}

export interface LegacyNoticeItem {
  label: string;
  url?: string | null;
  date?: string | null;
}

export interface NoticeConfig {
  heading: string;
  description?: string | null;
  boardId: string | null;
  limit: number;
  /** Legacy manual notice items kept only to render persisted configJson safely. */
  items?: LegacyNoticeItem[];
}

export interface GalleryCollectionConfig {
  heading: string;
  description?: string | null;
  boardIds: string[];
  boardTabLabels?: Record<string, string | null>;
  limit: number;
}

export type HomeSectionConfig =
  | ({ sectionType: 'HERO' } & { config: HeroConfig })
  | ({ sectionType: 'BRIEF_INTRO' } & { config: BriefIntroConfig })
  | ({ sectionType: 'FREQUENT_MENU' } & { config: FrequentMenuConfig })
  | ({ sectionType: 'NOTICE' } & { config: NoticeConfig })
  | ({ sectionType: 'GALLERY_COLLECTION' } & {
      config: GalleryCollectionConfig;
    });
