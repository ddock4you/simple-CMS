'use client';

import type { ReactNode } from 'react';

import { useCssVar } from './useCssVar';

/**
 * Design System stories 공용 폰트 스케일 (1.2 minor-third 비율).
 *
 * - meta (10px) — 토큰 인덱스 · 단계 표시 (floor)
 * - micro (12px) — utility code 표시 · hex 값
 * - body (14px) — description · 토큰 설명 본문
 * - medium (17px) — 강조 본문
 * - h3 (20px) — 카드 · 그룹 제목
 * - h2 (24px) — 섹션 제목
 * - h1 (28px) — 스토리 페이지 상단 제목
 */

interface ColorSwatchProps {
  /** CSS variable 이름. 예: `--primary`, `--background` */
  cssVar: string;
  /** Tailwind utility 표기. 예: `bg-primary`, `bg-background` */
  utility?: string;
  /** YAML 토큰 ID. 예: `{colors.primary}` */
  yamlKey?: string;
  /** 추가 설명 (사용처 등) */
  description?: ReactNode;
}

export function ColorSwatch({ cssVar, utility, yamlKey, description }: ColorSwatchProps) {
  const { ref, value } = useCssVar(cssVar);

  return (
    <div ref={ref} className="rounded-lg border bg-card text-card-foreground overflow-hidden">
      <div
        className="h-20 border-b"
        style={{ backgroundColor: `var(${cssVar})` }}
        aria-hidden
      />
      <div className="p-3 space-y-1">
        <div className="font-mono text-[14px] font-semibold">{cssVar}</div>
        {utility ? (
          <div className="font-mono text-[12px] text-muted-foreground">
            <code>{utility}</code>
          </div>
        ) : null}
        <div className="font-mono text-[12px] text-muted-foreground break-all" title={value}>
          {value || '—'}
        </div>
        {yamlKey ? (
          <div className="font-mono text-[10px] text-muted-foreground">{yamlKey}</div>
        ) : null}
        {description ? (
          <div className="text-[14px] text-muted-foreground pt-2 border-t mt-2">{description}</div>
        ) : null}
      </div>
    </div>
  );
}

interface TokenRowProps {
  name: string;
  /** 표시할 CSS variable (값 추출용) */
  cssVar?: string;
  utility?: string;
  yamlKey?: string;
  description?: ReactNode;
  /** 미리보기 element (직접 렌더) */
  preview: ReactNode;
}

/**
 * 색이 아닌 토큰(spacing, radius, shadow, typography)용 일반 행 카드.
 * 미리보기 영역과 메타 정보를 좌우로 배치한다.
 */
export function TokenRow({ name, cssVar, utility, yamlKey, description, preview }: TokenRowProps) {
  const { ref, value } = useCssVar(cssVar ?? '--__never__');

  return (
    <div className="rounded-lg border bg-card text-card-foreground p-4 flex items-center gap-4">
      <div ref={ref} className="flex-shrink-0 min-w-[120px] flex items-center justify-center">
        {preview}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-mono text-[17px] font-semibold">{name}</div>
        {utility ? (
          <div className="font-mono text-[14px] text-muted-foreground">
            <code>{utility}</code>
          </div>
        ) : null}
        {cssVar ? (
          <div className="font-mono text-[12px] text-muted-foreground">
            {cssVar}
            {value ? ` → ${value}` : ''}
          </div>
        ) : null}
        {yamlKey ? (
          <div className="font-mono text-[10px] text-muted-foreground">{yamlKey}</div>
        ) : null}
        {description ? (
          <div className="text-[14px] text-muted-foreground pt-1">{description}</div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 섹션 헤더 (h2 — 그룹 제목).
 * stories 안에서 통일된 헤더 스타일을 위해 공용 컴포넌트로 제공.
 */
export function SectionHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-[24px] font-bold leading-tight">{title}</h2>
      {description ? (
        <p className="text-[14px] text-muted-foreground mt-2">{description}</p>
      ) : null}
    </div>
  );
}

/** 그룹 제목 (h3 — 카드/팔레트 제목). */
export function GroupHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-[20px] font-semibold leading-tight">{title}</h3>
      {description ? (
        <p className="text-[14px] text-muted-foreground mt-1">{description}</p>
      ) : null}
    </div>
  );
}
