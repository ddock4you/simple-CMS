/**
 * KRDS Tailwind plugin (`@krds-ui/tailwindcss-plugin@0.6.0`) 토큰 카탈로그.
 *
 * 원본: node_modules/@krds-ui/tailwindcss-plugin/krds-plugin.js (`theme.extend.*`)
 * KRDS plugin이 단일 출처. 이 파일은 stories에서 utility class를 순회하기 위한 인덱스.
 *
 * 신규 KRDS 버전 업그레이드 시 plugin 파일의 변경분을 이 카탈로그에 반영.
 * 참고: https://uiux.egovframe.go.kr/guide/style/style_05.html
 */

// ── 색상 31 팔레트 ───────────────────────────────────────────────────

/** 일반 단계: 5/10/20/30/40/50/60/70/80/90 */
export const STANDARD_SHADES = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90] as const;

/** primary/secondary/gray/point만 0/100 단계 추가 */
export const PRIMARY_SHADES = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

export interface KrdsPalette {
  /** 토큰 이름 (예: `primary`, `royal-blue`) */
  name: string;
  /** 사용 가능한 shade 단계 */
  shades: readonly (number | string)[];
  /** Hex 값 매핑 (plugin과 동일). 표시용 — 토큰 추가 시 plugin과 1:1 확인 필수 */
  hex: Record<string | number, string>;
  /** 카테고리 그룹 */
  category: 'brand' | 'neutral' | 'status' | 'extended';
  /** 설명 */
  description?: string;
}

export const KRDS_PALETTES: KrdsPalette[] = [
  // Brand
  {
    name: 'primary',
    category: 'brand',
    shades: PRIMARY_SHADES,
    description: 'KRDS 기본 브랜드 색 (50: #246BEB)',
    hex: {
      0: '#FFFFFF', 5: '#EFF5FF', 10: '#D3E1FB', 20: '#A7C4F7', 30: '#7CA6F3', 40: '#5089EF',
      50: '#246BEB', 60: '#1D56BC', 70: '#16408D', 80: '#0E2B5E', 90: '#07152F', 100: '#000000',
    },
  },
  {
    name: 'secondary',
    category: 'brand',
    shades: PRIMARY_SHADES,
    description: '보조 브랜드 색 (50: #003675)',
    hex: {
      0: '#FFFFFF', 5: '#EDF1F5', 10: '#CDD7E4', 20: '#B4C4D6', 30: '#99B0CB', 40: '#2A5C96',
      50: '#003675', 60: '#002B5E', 70: '#002046', 80: '#00162F', 90: '#000B17', 100: '#000000',
    },
  },
  {
    name: 'point',
    category: 'brand',
    shades: PRIMARY_SHADES,
    description: '강조 포인트 색 (50: #E71825)',
    hex: {
      0: '#FFFFFF', 5: '#FDF2F3', 10: '#FBD6D8', 20: '#F5A3A8', 30: '#F1747C', 40: '#EC4651',
      50: '#E71825', 60: '#B9131E', 70: '#8B0E16', 80: '#5C0A0F', 90: '#2E0507', 100: '#000000',
    },
  },

  // Neutral
  {
    name: 'gray',
    category: 'neutral',
    shades: PRIMARY_SHADES,
    description: '중립 톤 (50: #8E8E8E)',
    hex: {
      0: '#FFFFFF', 5: '#F8F8F8', 10: '#F0F0F0', 20: '#E4E4E4', 30: '#D8D8D8', 40: '#C6C6C6',
      50: '#8E8E8E', 60: '#717171', 70: '#555555', 80: '#2D2D2D', 90: '#1D1D1D', 100: '#000000',
    },
  },

  // Status (시맨틱 피드백)
  {
    name: 'danger',
    category: 'status',
    shades: STANDARD_SHADES,
    description: '위험 · 오류 (50: #EB003B)',
    hex: {
      5: '#FEECF0', 10: '#FCD4DE', 20: '#F799B1', 30: '#F36689', 40: '#EF3E5E',
      50: '#EB003B', 60: '#D50136', 70: '#8D0023', 80: '#5E0018', 90: '#2F000C',
    },
  },
  {
    name: 'warning',
    category: 'status',
    shades: STANDARD_SHADES,
    description: '경고 · 주의 (50: #FFB724)',
    hex: {
      5: '#FFF8E9', 10: '#FFEAC1', 20: '#FFE2A7', 30: '#FFD47C', 40: '#FFC550',
      50: '#FFB724', 60: '#98690A', 70: '#66490E', 80: '#4D370B', 90: '#332507',
    },
  },
  {
    name: 'success',
    category: 'status',
    shades: STANDARD_SHADES,
    description: '성공 · 완료 (50: #008A1E)',
    hex: {
      5: '#EEF7F0', 10: '#CEE9D4', 20: '#B2DCBB', 30: '#8CCA99', 40: '#33A14B',
      50: '#008A1E', 60: '#006E18', 70: '#005312', 80: '#00370C', 90: '#002207',
    },
  },
  {
    name: 'info',
    category: 'status',
    shades: STANDARD_SHADES,
    description: '정보 · 안내 (50: #2768FF)',
    hex: {
      5: '#E9F0FF', 10: '#D4E1FF', 20: '#A9C3FF', 30: '#7DA4FF', 40: '#5286FF',
      50: '#2768FF', 60: '#1F53CC', 70: '#173E99', 80: '#0C1F4D', 90: '#040A1A',
    },
  },

  // Extended (확장 팔레트, 디자인 강조용)
  { name: 'navy', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#F1F1F9', 10: '#D3D5ED', 20: '#A7AEDA', 30: '#7B82C8', 40: '#4F57B5', 50: '#232EA3', 60: '#1C25B2', 70: '#151C62', 80: '#0E1241', 90: '#070921' } },
  { name: 'blue', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#F0F3FF', 10: '#D2DCFE', 20: '#A4B8FE', 30: '#7795FD', 40: '#4A71FC', 50: '#1C4EFC', 60: '#163ECA', 70: '#112F97', 80: '#0B1F65', 90: '#061032' } },
  { name: 'royal-blue', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#EBF5FF', 10: '#C7E3FF', 20: '#8FC8FF', 30: '#56ACFF', 40: '#0D76AE', 50: '#0D76AE', 60: '#0A5AA6', 70: '#04407F', 80: '#002B55', 90: '#00152A' } },
  { name: 'sky-blue', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#F0F8FF', 10: '#D4F3FE', 20: '#A9E6FC', 30: '#7DDAFB', 40: '#52CDFA', 50: '#27C1F8', 60: '#1F9AC6', 70: '#177495', 80: '#0F4D63', 90: '#082732' } },
  { name: 'aqua', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#E7FDFD', 10: '#CEFBFB', 20: '#9CF6F6', 30: '#6BF2F2', 40: '#39EDED', 50: '#08E8E8', 60: '#06BABA', 70: '#058C8C', 80: '#035D5D', 90: '#022F2F' } },
  { name: 'teal', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#EDF8F8', 10: '#CEEEED', 20: '#9DD7D7', 30: '#6DC3C3', 40: '#3CAEAE', 50: '#0B9B98', 60: '#097C7C', 70: '#075D5D', 80: '#043E3E', 90: '#021F1F' } },
  { name: 'green', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#EEF7EE', 10: '#CCE6CC', 20: '#99CC99', 30: '#66B366', 40: '#339933', 50: '#008000', 60: '#006600', 70: '#004D00', 80: '#003300', 90: '#001A00' } },
  { name: 'lime-green', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#F3FCF3', 10: '#D6F5D6', 20: '#ADEBAD', 30: '#84E184', 40: '#5BD75B', 50: '#32CD32', 60: '#28A428', 70: '#1E7B1E', 80: '#145214', 90: '#0A290A' } },
  { name: 'lime', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#F7FFEA', 10: '#EEFEDA', 20: '#DCFFAB', 30: '#CEFE83', 40: '#BCF95D', 50: '#A1F524', 60: '#8BD013', 70: '#6A9B16', 80: '#476912', 90: '#23570D' } },
  { name: 'olive', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#F8F8ED', 10: '#EBEBCC', 20: '#D6D699', 30: '#C2C266', 40: '#ADAD33', 50: '#999900', 60: '#7A7A00', 70: '#5C5C00', 80: '#3D3D00', 90: '#1F1F00' } },
  { name: 'yellow', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#FFFBE5', 10: '#FFF4CC', 20: '#FFEE99', 30: '#FFE566', 40: '#FFD033', 50: '#FFD400', 60: '#CCA300', 70: '#A38200', 80: '#665200', 90: '#332900' } },
  { name: 'gold', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#FDF7E9', 10: '#FAEFD3', 20: '#F5DFA7', 30: '#F1CF7A', 40: '#ECBF4E', 50: '#E7AF22', 60: '#B98C1B', 70: '#8B6915', 80: '#5C460E', 90: '#2E2307' } },
  { name: 'saddle-brown', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#F8F2ED', 10: '#ECDCCD', 20: '#D9B99C', 30: '#C6966A', 40: '#B37439', 50: '#A05107', 60: '#804106', 70: '#603104', 80: '#402003', 90: '#201001' } },
  { name: 'brown', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#F9F2F0', 10: '#EED8D3', 20: '#DCB0A7', 30: '#CB897C', 40: '#B96150', 50: '#A83A24', 60: '#862E1D', 70: '#652316', 80: '#43170E', 90: '#220C07' } },
  { name: 'dark-red', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#FAEFF0', 10: '#F1CED0', 20: '#E39D9F', 30: '#D56C6F', 40: '#C73A3F', 50: '#B9090F', 60: '#94070C', 70: '#6F0509', 80: '#4A0306', 90: '#250203' } },
  { name: 'red', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#FEF1F1', 10: '#FCCBCC', 20: '#F99999', 30: '#F56666', 40: '#F23B3B', 50: '#EE0000', 60: '#BE0000', 70: '#8F0000', 80: '#5F0000', 90: '#300000' } },
  { name: 'orange', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#FFF4F0', 10: '#FFD4CC', 20: '#FFB899', 30: '#FF9C66', 40: '#FF8033', 50: '#FF6400', 60: '#CC5000', 70: '#993C00', 80: '#662800', 90: '#331400' } },
  { name: 'coral', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#FFF8F5', 10: '#FFE6DC', 20: '#FFCDB8', 30: '#FFB495', 40: '#FF9B71', 50: '#FE8052', 60: '#CB6642', 70: '#984D31', 80: '#663321', 90: '#331A10' } },
  { name: 'salmon', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#FFF1F0', 10: '#FFE3E0', 20: '#FFCBC1', 30: '#FEACA3', 40: '#FE9184', 50: '#FD7565', 60: '#CA5E51', 70: '#97463D', 80: '#652F28', 90: '#321714' } },
  { name: 'hot-pink', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#FFF5FC', 10: '#FFE3F5', 20: '#FFC4EC', 30: '#FFAAE2', 40: '#FF8DD9', 50: '#FF6FCE', 60: '#CC59A5', 70: '#99437C', 80: '#662C53', 90: '#331629' } },
  { name: 'pink', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#FFF0F8', 10: '#FFD0E9', 20: '#FFA1D4', 30: '#FF72BE', 40: '#FF43A9', 50: '#FF1493', 60: '#CC1076', 70: '#990C58', 80: '#66083B', 90: '#33041D' } },
  { name: 'fuchsia', category: 'extended', shades: [5, 10, 20, 30, 40, 50], hex: { 5: '#FDF2FD', 10: '#F901F9', 20: '#F2A3F2', 30: '#EC75EC', 40: '#E547E5', 50: '#DF19DF' } },
  { name: 'purple', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#F5EEF7', 10: '#E1CCE6', 20: '#C499CC', 30: '#A666B3', 40: '#893399', 50: '#600080', 60: '#4D0066', 70: '#3A004D', 80: '#260033', 90: '#13001A' } },
  { name: 'blue-violet', category: 'extended', shades: STANDARD_SHADES, hex: { 5: '#F4EFFA', 10: '#DED1F1', 20: '#BDA2E3', 30: '#9B74D4', 40: '#7A45C6', 50: '#5917B8', 60: '#471293', 70: '#350E6E', 80: '#24094A', 90: '#120525' } },
];

// ── Typography (~50개) ───────────────────────────────────────────────

export interface KrdsTypographyToken {
  name: string;
  utility: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
  group: 'display' | 'heading' | 'title' | 'body' | 'detail' | 'label' | 'link';
}

export const KRDS_TYPOGRAPHY: KrdsTypographyToken[] = [
  // Display (66/50/40)
  { name: 'display-l', utility: 'text-display-l', fontSize: '66px', lineHeight: '150%', letterSpacing: '1px', group: 'display' },
  { name: 'display-m', utility: 'text-display-m', fontSize: '50px', lineHeight: '150%', letterSpacing: '1px', group: 'display' },
  { name: 'display-s', utility: 'text-display-s', fontSize: '40px', lineHeight: '150%', letterSpacing: '1px', group: 'display' },

  // Heading (50/40/32)
  { name: 'heading-l', utility: 'text-heading-l', fontSize: '50px', lineHeight: '150%', letterSpacing: '1px', group: 'heading' },
  { name: 'heading-m', utility: 'text-heading-m', fontSize: '40px', lineHeight: '150%', letterSpacing: '1px', group: 'heading' },
  { name: 'heading-s', utility: 'text-heading-s', fontSize: '32px', lineHeight: '150%', letterSpacing: '1px', group: 'heading' },

  // Title (32/25/21/19/17/15)
  { name: 'title-xxl', utility: 'text-title-xxl', fontSize: '32px', lineHeight: '150%', letterSpacing: '1px', group: 'title' },
  { name: 'title-xl', utility: 'text-title-xl', fontSize: '25px', lineHeight: '150%', group: 'title' },
  { name: 'title-l', utility: 'text-title-l', fontSize: '21px', lineHeight: '150%', group: 'title' },
  { name: 'title-m', utility: 'text-title-m', fontSize: '19px', lineHeight: '150%', group: 'title' },
  { name: 'title-s', utility: 'text-title-s', fontSize: '17px', lineHeight: '150%', group: 'title' },
  { name: 'title-xs', utility: 'text-title-xs', fontSize: '15px', lineHeight: '150%', group: 'title' },

  // Body (19/17/15)
  { name: 'body-l', utility: 'text-body-l', fontSize: '19px', lineHeight: '150%', group: 'body' },
  { name: 'body-m', utility: 'text-body-m', fontSize: '17px', lineHeight: '150%', group: 'body' },
  { name: 'body-s', utility: 'text-body-s', fontSize: '15px', lineHeight: '150%', group: 'body' },

  // Detail (17/15/13)
  { name: 'detail-l', utility: 'text-detail-l', fontSize: '17px', lineHeight: '150%', group: 'detail' },
  { name: 'detail-m', utility: 'text-detail-m', fontSize: '15px', lineHeight: '150%', group: 'detail' },
  { name: 'detail-s', utility: 'text-detail-s', fontSize: '13px', lineHeight: '150%', group: 'detail' },

  // Label (19/17/15/13)
  { name: 'label-l', utility: 'text-label-l', fontSize: '19px', lineHeight: '150%', group: 'label' },
  { name: 'label-m', utility: 'text-label-m', fontSize: '17px', lineHeight: '150%', group: 'label' },
  { name: 'label-s', utility: 'text-label-s', fontSize: '15px', lineHeight: '150%', group: 'label' },
  { name: 'label-xs', utility: 'text-label-xs', fontSize: '13px', lineHeight: '150%', group: 'label' },

  // Link (19/17/15)
  { name: 'link-l', utility: 'text-link-l', fontSize: '19px', lineHeight: '150%', group: 'link' },
  { name: 'link-m', utility: 'text-link-m', fontSize: '17px', lineHeight: '150%', group: 'link' },
  { name: 'link-s', utility: 'text-link-s', fontSize: '15px', lineHeight: '150%', group: 'link' },
];

// ── Spacing (0~10) ───────────────────────────────────────────────────

export interface KrdsSpacingToken {
  step: number;
  px: number;
  utility: string;
  description?: string;
}

export const KRDS_SPACING: KrdsSpacingToken[] = [
  { step: 0, px: 0, utility: 'p-0' },
  { step: 1, px: 2, utility: 'p-1', description: '미세 간격 (Tailwind 기본 4px와 다름)' },
  { step: 2, px: 4, utility: 'p-2' },
  { step: 3, px: 8, utility: 'p-3' },
  { step: 4, px: 12, utility: 'p-4' },
  { step: 5, px: 16, utility: 'p-5', description: '본문 기본 간격' },
  { step: 6, px: 20, utility: 'p-6' },
  { step: 7, px: 24, utility: 'p-7', description: '섹션 padding 기본' },
  { step: 8, px: 32, utility: 'p-8' },
  { step: 9, px: 40, utility: 'p-9' },
  { step: 10, px: 48, utility: 'p-10', description: '섹션 간 큰 여백' },
];

// ── Border Radius (0~9) ──────────────────────────────────────────────

export interface KrdsRadiusToken {
  step: number;
  px: number;
  utility: string;
}

export const KRDS_RADIUS: KrdsRadiusToken[] = [
  { step: 0, px: 0, utility: 'rounded-0' },
  { step: 1, px: 2, utility: 'rounded-1' },
  { step: 2, px: 4, utility: 'rounded-2' },
  { step: 3, px: 6, utility: 'rounded-3' },
  { step: 4, px: 8, utility: 'rounded-4' },
  { step: 5, px: 12, utility: 'rounded-5' },
  { step: 6, px: 16, utility: 'rounded-6' },
  { step: 7, px: 20, utility: 'rounded-7' },
  { step: 8, px: 24, utility: 'rounded-8' },
  { step: 9, px: 40, utility: 'rounded-9' },
];

// ── Breakpoints ──────────────────────────────────────────────────────

export interface KrdsBreakpoint {
  name: string;
  minWidth: number;
  utility: string;
  description: string;
}

export const KRDS_BREAKPOINTS: KrdsBreakpoint[] = [
  { name: 'mobile', minWidth: 360, utility: 'mobile:', description: '~600px: 모바일' },
  { name: 'tablet', minWidth: 601, utility: 'tablet:', description: '601px~1024px: 태블릿' },
  { name: 'desktop', minWidth: 1025, utility: 'desktop:', description: '1025px~: 데스크톱' },
];

// ── Font Weight ──────────────────────────────────────────────────────

export const KRDS_FONT_WEIGHTS = [
  { name: 'regular', value: 400, utility: 'font-regular' },
  { name: 'bold', value: 700, utility: 'font-bold' },
] as const;
