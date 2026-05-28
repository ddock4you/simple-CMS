export type SiteFooterSocialPlatform =
  | 'instagram'
  | 'youtube'
  | 'x'
  | 'facebook'
  | 'blog';

export interface SiteFooterQuickLink {
  title: string;
  url: string;
  openInNewTab?: boolean;
}

export interface SiteFooterContact {
  title: string;
  description: string;
}

export interface SiteFooterSocialLink {
  platform: SiteFooterSocialPlatform;
  href: string;
  openInNewTab?: boolean;
}

export interface SiteFooterBottomLink {
  text: string;
  href: string;
  openInNewTab?: boolean;
  isHighlighted?: boolean;
}

export interface SiteFooterConfig {
  address: string | null;
  contacts: SiteFooterContact[];
  quickLinks: SiteFooterQuickLink[];
  socialLinks: SiteFooterSocialLink[];
  bottomLinks: SiteFooterBottomLink[];
  identifierText: string | null;
  copyright: string | null;
  hideQuickLinks: boolean;
  hideIdentifier: boolean;
}

export const DEFAULT_SITE_FOOTER_CONFIG: SiteFooterConfig = {
  address: null,
  contacts: [],
  quickLinks: [],
  socialLinks: [],
  bottomLinks: [
    { text: '개인정보처리방침', href: '/p/privacy', isHighlighted: true },
    { text: '저작권 정책', href: '/p/copyright' },
  ],
  identifierText: null,
  copyright: null,
  hideQuickLinks: false,
  hideIdentifier: false,
};

export const DEFAULT_SITE_FOOTER_IDENTIFIER_TEXT =
  '이 누리집은 공공서비스 제공을 위한 누리집입니다.';
