'use client';

import type { ReactNode } from 'react';

/**
 * Web Design System stories 공용 폰트 스케일 (1.2 minor-third 비율).
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
  /** KRDS token label. 예: `primary-50` */
  utility: string;
  /** 토큰 이름 (라벨용). 예: `primary-50` */
  name: string;
  /** 단계 (optional, 단계 강조용). 예: 50 */
  shade?: number | string;
  /**
    * Hex 값. KRDS token table이 단일 출처.
   * Tailwind v4의 source scanning이 동적 className(`${utility}`)을 따라가지 못해 빌드 시 누락될 수 있으므로
   * 시각화는 inline style로 직접 적용하고, utility 이름은 라벨로만 표시한다.
   */
  hex: string;
  /** 추가 설명 */
  description?: ReactNode;
}

export function ColorSwatch({ utility, name, shade, hex, description }: ColorSwatchProps) {
  return (
    <div
      className="overflow-hidden bg-white"
      style={{ borderRadius: 8, border: '1px solid #E4E4E4' }}
    >
      <div className="h-20" style={{ backgroundColor: hex }} aria-hidden />
      <div className="p-[16px] space-y-[6px]">
        <div className="font-mono text-[14px] font-bold leading-tight">{name}</div>
        <div className="font-mono text-[12px]" style={{ color: '#555555' }}>
          {hex.toUpperCase()}
        </div>
        <div className="font-mono text-[12px]" style={{ color: '#717171' }}>
          <code>{utility}</code>
        </div>
        {description ? (
          <div
            className="text-[14px] pt-[8px] mt-[8px] leading-relaxed"
            style={{ borderTop: '1px solid #F0F0F0', color: '#555555' }}
          >
            {description}
          </div>
        ) : null}
        {shade !== undefined ? (
          <div className="text-[10px] mt-[4px]" style={{ color: '#8E8E8E' }}>
            단계 {shade}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface TypographySampleProps {
  name: string;
  utility: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
  group: string;
}

/**
 * Typography 토큰 샘플. fontSize/lineHeight/letterSpacing은 KRDS 정의값을 inline style로 직접 적용.
 * `text-display-s` 같은 옛 plugin utility 이름은 라벨로만 표시.
 */
export function TypographySample({
  name,
  utility,
  fontSize,
  lineHeight,
  letterSpacing,
  group,
}: TypographySampleProps) {
  return (
    <div
      className="bg-white p-[24px]"
      style={{ borderRadius: 8, border: '1px solid #E4E4E4' }}
    >
      <div
        className="flex items-baseline justify-between mb-[12px] pb-[12px]"
        style={{ borderBottom: '1px solid #F0F0F0' }}
      >
        <div>
          <span className="font-mono text-[17px] font-bold">{name}</span>
          <span className="font-mono text-[12px] ml-[12px]" style={{ color: '#717171' }}>
            {group}
          </span>
        </div>
        <code className="font-mono text-[14px]" style={{ color: '#555555' }}>
          {utility}
        </code>
      </div>
      <p style={{ fontSize, lineHeight, letterSpacing, margin: 0 }}>
        대한민국 정부 디자인 시스템 KRDS · The quick brown fox.
      </p>
      <div className="mt-[16px] font-mono text-[12px]" style={{ color: '#717171' }}>
        {fontSize} / line-height {lineHeight}
        {letterSpacing ? ` / letter-spacing ${letterSpacing}` : ''}
      </div>
    </div>
  );
}

/** 섹션 헤더 (h2 — 그룹 제목). web 공용 폰트 스케일 적용. */
export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="mb-[32px]">
      <h2 className="text-[24px] font-bold leading-tight" style={{ color: '#1D1D1D' }}>
        {title}
      </h2>
      {description ? (
        <p className="text-[14px] mt-[8px] leading-relaxed" style={{ color: '#555555' }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** 그룹 제목 (h3 — 카드/팔레트 제목). */
export function GroupHeader({
  title,
  description,
}: {
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="mb-[20px]">
      <h3 className="text-[20px] font-bold leading-tight" style={{ color: '#1D1D1D' }}>
        {title}
      </h3>
      {description ? (
        <p className="text-[14px] mt-[4px]" style={{ color: '#717171' }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
