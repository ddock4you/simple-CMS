/**
 * Admin Design System 토큰 카탈로그 (이름 단일 출처).
 *
 * 값은 `apps/admin/app/globals.css`가 권위. 이 파일은 토큰 *이름* 목록만 갖는다.
 * `verify-design-tokens.mjs`가 검증하는 design.md YAML 토큰과 동일한 키 세트.
 *
 * 신규 토큰 추가 시:
 * 1. globals.css의 :root + .dark 페어에 정의
 * 2. design.md YAML frontmatter에 hex 추가
 * 3. 이 파일의 해당 그룹 배열에 추가
 * 4. `pnpm --filter @simple-cms/admin design:verify`로 ΔE 검증
 */

export type ColorCategory = 'surface' | 'action' | 'status' | 'border';

export interface ColorToken {
  /** CSS variable 이름 (예: `--primary`) */
  cssVar: string;
  /** Tailwind utility class (예: `bg-primary`) */
  utility: string;
  /** YAML key (예: `{colors.primary}`) */
  yamlKey: string;
  /** 사용처 메모 (design.md §2 미러) */
  description?: string;
  /** 카테고리 — Colors stories 분할에 사용 (web Brand/Neutral/Status/Extended 패턴 미러) */
  category: ColorCategory;
}

export const COLOR_TOKENS: ColorToken[] = [
  // ── Surface (background / foreground / card / popover / muted / accent) ──
  { cssVar: '--background', utility: 'bg-background', yamlKey: '{colors.background}', description: '페이지 기본 배경', category: 'surface' },
  { cssVar: '--foreground', utility: 'text-foreground', yamlKey: '{colors.foreground}', description: '본문 텍스트 색', category: 'surface' },
  { cssVar: '--card', utility: 'bg-card', yamlKey: '{colors.card}', description: 'Card 컴포넌트 배경', category: 'surface' },
  { cssVar: '--card-foreground', utility: 'text-card-foreground', yamlKey: '{colors.card-foreground}', description: 'Card 본문 텍스트', category: 'surface' },
  { cssVar: '--popover', utility: 'bg-popover', yamlKey: '{colors.popover}', description: 'Dialog · Tooltip · Popover 배경', category: 'surface' },
  { cssVar: '--popover-foreground', utility: 'text-popover-foreground', yamlKey: '{colors.popover-foreground}', description: 'Popover 본문 텍스트', category: 'surface' },
  { cssVar: '--muted', utility: 'bg-muted', yamlKey: '{colors.muted}', description: '보조 배경 (테이블 헤더 등)', category: 'surface' },
  { cssVar: '--muted-foreground', utility: 'text-muted-foreground', yamlKey: '{colors.muted-foreground}', description: 'hint · placeholder · 보조 설명 (필수 정보에 사용 금지)', category: 'surface' },
  { cssVar: '--accent', utility: 'bg-accent', yamlKey: '{colors.accent}', description: 'hover 등 강조 배경', category: 'surface' },
  { cssVar: '--accent-foreground', utility: 'text-accent-foreground', yamlKey: '{colors.accent-foreground}', description: 'accent 위 텍스트', category: 'surface' },

  // ── Action (primary / secondary / destructive) ──
  { cssVar: '--primary', utility: 'bg-primary', yamlKey: '{colors.primary}', description: '주 CTA — 저장 · 추가 · 발행 · 승인 (admin 유일 액션 색)', category: 'action' },
  { cssVar: '--primary-foreground', utility: 'text-primary-foreground', yamlKey: '{colors.primary-foreground}', description: 'primary 버튼 위 텍스트', category: 'action' },
  { cssVar: '--secondary', utility: 'bg-secondary', yamlKey: '{colors.secondary}', description: '보조 액션 — 취소 · 닫기 · 편집 진입', category: 'action' },
  { cssVar: '--secondary-foreground', utility: 'text-secondary-foreground', yamlKey: '{colors.secondary-foreground}', description: 'secondary 버튼 위 텍스트', category: 'action' },
  { cssVar: '--destructive', utility: 'bg-destructive', yamlKey: '{colors.destructive}', description: '삭제 · 거절 · 정지 · 비활성', category: 'action' },

  // ── Status (success / warning) ──
  { cssVar: '--success', utility: 'bg-success', yamlKey: '{colors.success}', description: 'diff add · 긍정 평가 · DNS 정상 · 성공', category: 'status' },
  { cssVar: '--success-foreground', utility: 'text-success-foreground', yamlKey: '{colors.success-foreground}', description: 'success 위 텍스트', category: 'status' },
  { cssVar: '--warning', utility: 'bg-warning', yamlKey: '{colors.warning}', description: 'pin · DNS pending · slug 경고 · 비파괴 주의', category: 'status' },
  { cssVar: '--warning-foreground', utility: 'text-warning-foreground', yamlKey: '{colors.warning-foreground}', description: 'warning 위 텍스트', category: 'status' },

  // ── Border · Input · Focus ──
  { cssVar: '--border', utility: 'border-border', yamlKey: '{colors.border}', description: '카드 · 패널 · 입력 경계', category: 'border' },
  { cssVar: '--input', utility: 'border-input', yamlKey: '{colors.input}', description: '입력 컨트롤 경계', category: 'border' },
  { cssVar: '--ring', utility: 'ring-ring', yamlKey: '{colors.ring}', description: 'focus ring', category: 'border' },
];

// ── 카테고리 헬퍼 ──
export function getColorsByCategory(category: ColorCategory): ColorToken[] {
  return COLOR_TOKENS.filter((t) => t.category === category);
}

// ── sidebar / chart 토큰 (globals.css 전용, design.md YAML 제외) ──

export interface ExtraColorToken {
  cssVar: string;
  utility: string;
  yamlKey: string;
  description?: string;
}

export const SIDEBAR_TOKENS: ExtraColorToken[] = [
  { cssVar: '--sidebar', utility: 'bg-sidebar', yamlKey: '—', description: 'AppSidebar 배경' },
  { cssVar: '--sidebar-foreground', utility: 'text-sidebar-foreground', yamlKey: '—' },
  { cssVar: '--sidebar-primary', utility: 'bg-sidebar-primary', yamlKey: '—' },
  { cssVar: '--sidebar-primary-foreground', utility: 'text-sidebar-primary-foreground', yamlKey: '—' },
  { cssVar: '--sidebar-accent', utility: 'bg-sidebar-accent', yamlKey: '—' },
  { cssVar: '--sidebar-accent-foreground', utility: 'text-sidebar-accent-foreground', yamlKey: '—' },
  { cssVar: '--sidebar-border', utility: 'border-sidebar-border', yamlKey: '—' },
  { cssVar: '--sidebar-ring', utility: 'ring-sidebar-ring', yamlKey: '—' },
];

export const CHART_TOKENS: ExtraColorToken[] = [
  { cssVar: '--chart-1', utility: 'bg-chart-1', yamlKey: '—', description: 'recharts series 1' },
  { cssVar: '--chart-2', utility: 'bg-chart-2', yamlKey: '—' },
  { cssVar: '--chart-3', utility: 'bg-chart-3', yamlKey: '—' },
  { cssVar: '--chart-4', utility: 'bg-chart-4', yamlKey: '—' },
  { cssVar: '--chart-5', utility: 'bg-chart-5', yamlKey: '—' },
];

// ── Typography ──

export interface TypographyToken {
  name: string;
  yamlKey: string;
  className: string;
  description?: string;
}

export const TYPOGRAPHY_TOKENS: TypographyToken[] = [
  {
    name: 'page-title',
    yamlKey: '{typography.page-title}',
    className: 'text-2xl font-semibold tracking-tight',
    description: 'PageHeader title · 24px / 600 / -0.025em',
  },
  {
    name: 'section-title',
    yamlKey: '{typography.section-title}',
    className: 'text-lg font-semibold',
    description: 'Card title · 폼 섹션 헤더 · 18px / 600',
  },
  {
    name: 'body',
    yamlKey: '{typography.body}',
    className: 'text-sm',
    description: '본문 기본 — 14px / 400 / 데이터 밀도 우선',
  },
  {
    name: 'body-strong',
    yamlKey: '{typography.body-strong}',
    className: 'text-base',
    description: '상세 메타 · Dialog body · 16px',
  },
  {
    name: 'caption',
    yamlKey: '{typography.caption}',
    className: 'text-xs text-muted-foreground',
    description: '폼 hint · 테이블 secondary · 12px',
  },
  {
    name: 'mono',
    yamlKey: '{typography.mono}',
    className: 'font-mono text-xs',
    description: 'inline code · ID 표시 · 12px',
  },
];

// ── Spacing ──

export interface SpacingToken {
  name: string;
  yamlKey: string;
  utility: string;
  cssVar?: string;
  px: string;
  description?: string;
}

export const SPACING_TOKENS: SpacingToken[] = [
  { name: 'xs', yamlKey: '{spacing.xs}', utility: 'p-1', px: '4px', description: '아이콘·라벨 간격, chip 내부' },
  { name: 'sm', yamlKey: '{spacing.sm}', utility: 'p-2', px: '8px', description: '버튼 내부 padding, Badge' },
  { name: 'md', yamlKey: '{spacing.md}', utility: 'p-4', px: '16px', description: '섹션 내부 요소 간격' },
  { name: 'lg', yamlKey: '{spacing.lg}', utility: 'p-6', px: '24px', description: '카드 padding · 페이지 수평 여백' },
  { name: 'xl', yamlKey: '{spacing.xl}', utility: 'p-8', px: '32px', description: '섹션 간 여백' },
  { name: 'page-x', yamlKey: '{spacing.page-x}', utility: 'px-page-x', cssVar: '--spacing-page-x', px: '24px', description: '페이지 좌우 padding' },
  { name: 'card', yamlKey: '{spacing.card}', utility: 'p-card', cssVar: '--spacing-card', px: '24px', description: 'Card 내부 padding' },
];

// ── Radius ──

export interface RadiusToken {
  name: string;
  yamlKey: string;
  utility: string;
  cssVar: string;
  description?: string;
}

export const RADIUS_TOKENS: RadiusToken[] = [
  { name: 'sm', yamlKey: '{rounded.sm}', utility: 'rounded-sm', cssVar: '--radius-sm', description: 'Badge · chip · 작은 인디케이터' },
  { name: 'md', yamlKey: '{rounded.md}', utility: 'rounded-md', cssVar: '--radius-md', description: 'Button · Input · Select' },
  { name: 'lg', yamlKey: '{rounded.lg}', utility: 'rounded-lg', cssVar: '--radius-lg', description: 'Card · Dialog · Popover · Tooltip (shadcn 기본)' },
  { name: 'xl', yamlKey: '{rounded.xl}', utility: 'rounded-xl', cssVar: '--radius-xl', description: 'Sheet · 큰 오버레이' },
  { name: 'full', yamlKey: '{rounded.full}', utility: 'rounded-full', cssVar: '—', description: '완전 pill — 검색 chip · 원형 아이콘' },
];

// ── Shadow ──

export interface ShadowToken {
  name: string;
  utility: string;
  cssVar: string;
  description?: string;
  usage: string;
}

export const SHADOW_TOKENS: ShadowToken[] = [
  {
    name: 'card',
    utility: 'shadow-card',
    cssVar: '--shadow-card-value',
    description: 'light: 0 1px 2px 4% / dark: 0 1px 3px 20%',
    usage: 'BlockContentView · MediaCard 선택 배지 · AppSidebar floating',
  },
  {
    name: 'popover',
    utility: 'shadow-popover',
    cssVar: '--shadow-popover-value',
    description: 'light: 0 4px 24px 8% + 0 2px 8px 4% / dark: 0 4px 24px 30% + 0 2px 8px 20%',
    usage: 'Dialog · Tooltip · Popover · Select · DropdownMenu · Sheet (wrapper 4개)',
  },
];

// ── Control height (form baseline) ──

export interface ControlHeightToken {
  name: string;
  cssVar: string;
  px: string;
  description: string;
}

export const CONTROL_HEIGHT_TOKENS: ControlHeightToken[] = [
  { name: 'default', cssVar: '--control-h-default', px: '32px (2rem)', description: '기본 — Input · Select · Button default' },
  { name: 'sm', cssVar: '--control-h-sm', px: '32px (2rem)', description: 'sm size도 동일 높이 (padding/font/rounded만 차별)' },
  { name: 'xs', cssVar: '--control-h-xs', px: '24px (1.5rem)', description: '컴팩트 케이스 (아이콘 버튼 등)' },
  { name: 'lg', cssVar: '--control-h-lg', px: '36px (2.25rem)', description: '큰 액션 버튼' },
];
