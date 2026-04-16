import { Fragment } from 'react';
import DOMPurify from 'isomorphic-dompurify';

import type { PageBlockType } from '@simple-cms/types';

import { renderTiptapContent } from '@/shared/lib/renderContent';
import { TiptapContent } from '@/shared/ui/TiptapContent';

/**
 * 서브페이지 블록 렌더러 (Stage 6)
 *
 * Server Component — 블록 타입별 분기 렌더링. 클라이언트 JS 0.
 *
 * 시안 확정 전 임시 스타일: `apps/web/app/globals.css`의 `.subpage-block-*` 클래스.
 * 시안 확정 시 이 파일 하나만 교체하면 admin CRUD/DB 구조는 변경 없음.
 */

interface BlockInput {
  id: string;
  blockType: PageBlockType;
  configJson: unknown;
  displayOrder: number;
  isVisible?: boolean;
}

/** IFRAME 서버 측 재검증용 허용 호스트 (클라이언트 admin과 동일 목록). */
const IFRAME_ALLOWED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
]);

function isIframeSrcAllowed(src: string): boolean {
  try {
    return IFRAME_ALLOWED_HOSTS.has(new URL(src).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * HTML 블록은 관리자가 입력한 자유 HTML — DOMPurify로 sanitize.
 * (Tiptap 본문과 동일한 ALLOWED_TAGS/ATTR 재사용은 과하지 않게 블록에 맞게 축소 가능하나
 * 일관성을 위해 렌더러 자체에서 config를 유지. 필요 시 `apps/web/src/shared/lib/renderContent.ts` 설정과 동기화.)
 */
const HTML_PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'u', 's', 'sub', 'sup', 'mark',
    'a', 'img',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'title',
    'src', 'alt', 'width', 'height',
    'style', 'class',
    'colspan', 'rowspan',
  ],
};

function RichTextBlock({ config }: { config: unknown }) {
  const cfg = config as { contentJson?: unknown } | null;
  if (!cfg?.contentJson) return null;
  const html = renderTiptapContent(cfg.contentJson);
  if (!html) return null;
  return (
    <div className="subpage-block subpage-block-richtext">
      <TiptapContent html={html} />
    </div>
  );
}

function HtmlBlock({ config }: { config: unknown }) {
  const cfg = config as { html?: string } | null;
  const raw = cfg?.html ?? '';
  if (!raw.trim()) return null;
  const sanitized = DOMPurify.sanitize(raw, HTML_PURIFY_CONFIG);
  return (
    <div
      className="subpage-block subpage-block-html"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

function ImageBlock({ config }: { config: unknown }) {
  const cfg = config as {
    imageUrl?: string;
    imageAlt?: string;
    caption?: string | null;
    linkUrl?: string | null;
  } | null;
  if (!cfg?.imageUrl || !cfg.imageAlt) return null;

  const inner = (
    <figure className="subpage-block subpage-block-image">
      {/* 외부 URL과 업로드 URL 모두 수용 — next/image 대신 img 사용 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cfg.imageUrl} alt={cfg.imageAlt} loading="lazy" />
      {cfg.caption && <figcaption>{cfg.caption}</figcaption>}
    </figure>
  );

  if (cfg.linkUrl) {
    return (
      <a
        href={cfg.linkUrl}
        className="subpage-block-image-link"
        target={cfg.linkUrl.startsWith('http') ? '_blank' : undefined}
        rel={cfg.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {inner}
      </a>
    );
  }
  return inner;
}

function IframeBlock({ config }: { config: unknown }) {
  const cfg = config as {
    src?: string;
    title?: string;
    aspectRatio?: '16:9' | '4:3' | '1:1';
    allowFullscreen?: boolean;
  } | null;
  if (!cfg?.src || !cfg.title) return null;

  // 2중 방어: 서버에서 허용 호스트 재확인. 관리자가 우회 입력 시에도 공개 웹 차단.
  if (!isIframeSrcAllowed(cfg.src)) return null;

  const ratio = cfg.aspectRatio ?? '16:9';
  return (
    <div
      className="subpage-block subpage-block-iframe"
      data-ratio={ratio}
    >
      <iframe
        src={cfg.src}
        title={cfg.title}
        allowFullScreen={cfg.allowFullscreen ?? true}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

interface SubpageBlockRendererProps {
  blocks: BlockInput[];
  /**
   * true이면 isVisible=false 블록도 렌더(숨김 배지 wrapper와 함께). Stage 7a preview 전용.
   * 기본값은 false — 공개 웹 기본 동작(isVisible=true만 렌더).
   */
  showHidden?: boolean;
}

function renderBlock(block: BlockInput) {
  switch (block.blockType) {
    case 'RICH_TEXT':
      return <RichTextBlock config={block.configJson} />;
    case 'HTML':
      return <HtmlBlock config={block.configJson} />;
    case 'IMAGE':
      return <ImageBlock config={block.configJson} />;
    case 'IFRAME':
      return <IframeBlock config={block.configJson} />;
    default:
      return null;
  }
}

export function SubpageBlockRenderer({
  blocks,
  showHidden = false,
}: SubpageBlockRendererProps) {
  const visibleBlocks = showHidden
    ? blocks
    : blocks.filter((b) => b.isVisible !== false);

  if (visibleBlocks.length === 0) return null;

  return (
    <div className="subpage-blocks">
      {visibleBlocks.map((block) => {
        const rendered = renderBlock(block);
        if (!rendered) return null;

        if (showHidden && block.isVisible === false) {
          return (
            <div
              key={block.id}
              className="subpage-block-hidden-preview"
            >
              {rendered}
            </div>
          );
        }

        return <Fragment key={block.id}>{rendered}</Fragment>;
      })}
    </div>
  );
}
