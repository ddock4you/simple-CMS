'use client';

import dynamic from 'next/dynamic';
import type { LucideIcon } from 'lucide-react';
import {
  Code2,
  EyeOff,
  Image as ImageIcon,
  MonitorPlay,
  Type,
} from 'lucide-react';

import type { PageBlockType, PageBlockListItem } from '@simple-cms/types';

import { renderTiptapContentForAdmin } from '@/shared/lib/renderContent';
import { resolveMediaPreviewUrl } from '@/shared/lib/mediaUrl';
import { Badge } from '@/shared/ui/shadcn/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/shadcn/tabs';

import { BLOCK_TYPE_LABELS } from '../model/blockLabels';

const BLOCK_TYPE_ICONS: Record<PageBlockType, LucideIcon> = {
  RICH_TEXT: Type,
  HTML: Code2,
  IMAGE: ImageIcon,
  IFRAME: MonitorPlay,
};

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false, loading: () => <MonacoLoading /> },
);

function MonacoLoading() {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
      에디터 로딩 중...
    </div>
  );
}

const EMPTY_HINT = <span className="text-muted-foreground">(비어있음)</span>;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all">{children}</dd>
    </div>
  );
}

function RichTextBlockContent({ config }: { config: unknown }) {
  const cfg = config as { contentJson?: unknown } | null;
  if (!cfg?.contentJson) return EMPTY_HINT;
  const html = renderTiptapContentForAdmin(cfg.contentJson);
  if (!html || !html.replace(/<[^>]+>/g, '').trim()) return EMPTY_HINT;
  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const READ_ONLY_MONACO_OPTIONS = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  wordWrap: 'on',
  automaticLayout: true,
  fontSize: 13,
  tabSize: 2,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  renderLineHighlight: 'none',
  contextmenu: false,
} as const;

function ReadOnlyMonaco({
  language,
  value,
}: {
  language: 'html' | 'css';
  value: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <MonacoEditor
        height="220px"
        defaultLanguage={language}
        value={value}
        options={READ_ONLY_MONACO_OPTIONS}
      />
    </div>
  );
}

function HtmlBlockContent({ config }: { config: unknown }) {
  const cfg = config as { html?: string; css?: string | null } | null;
  const html = cfg?.html?.trim() ? (cfg!.html as string) : '';
  const css = cfg?.css?.trim() ? (cfg!.css as string) : '';

  if (!html && !css) return EMPTY_HINT;

  // 둘 다 있으면 Tabs
  if (html && css) {
    return (
      <Tabs defaultValue="html">
        <TabsList>
          <TabsTrigger value="html">
            HTML
            <Badge variant="secondary" className="ml-1.5">
              {html.length.toLocaleString()}자
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="css">
            CSS
            <Badge variant="secondary" className="ml-1.5">
              {css.length.toLocaleString()}자
            </Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="html" className="pt-3">
          <ReadOnlyMonaco language="html" value={html} />
        </TabsContent>
        <TabsContent value="css" className="pt-3">
          <ReadOnlyMonaco language="css" value={css} />
        </TabsContent>
      </Tabs>
    );
  }

  // 한쪽만 있는 경우 — 라벨 Badge + 단일 Monaco
  const language = html ? 'html' : 'css';
  const value = html || css;
  const label = html ? 'HTML' : 'CSS';
  return (
    <div className="space-y-2">
      <Badge variant="secondary">
        {label} {value.length.toLocaleString()}자
      </Badge>
      <ReadOnlyMonaco language={language} value={value} />
    </div>
  );
}

function ImageBlockContent({ config }: { config: unknown }) {
  const cfg = config as {
    imageUrl?: string;
    imageAlt?: string;
    caption?: string | null;
    linkUrl?: string | null;
  } | null;
  const imageUrl = cfg?.imageUrl?.trim() ?? '';
  if (!imageUrl) return EMPTY_HINT;

  const imageAlt = cfg?.imageAlt?.trim() ?? '';
  const caption = cfg?.caption?.trim() ?? '';
  const linkUrl = cfg?.linkUrl?.trim() ?? '';

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveMediaPreviewUrl(imageUrl)}
        alt={imageAlt}
        className="max-h-40 max-w-xs rounded-md border object-contain"
      />
      <dl className="space-y-1">
        <Field label="이미지 URL">
          <span className="font-mono text-xs">{imageUrl}</span>
        </Field>
        <Field label="Alt">
          {imageAlt || <span className="text-muted-foreground">—</span>}
        </Field>
        <Field label="캡션">
          {caption || <span className="text-muted-foreground">—</span>}
        </Field>
        <Field label="링크">
          {linkUrl ? (
            <span className="font-mono text-xs">{linkUrl}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Field>
      </dl>
    </div>
  );
}

function IframeBlockContent({ config }: { config: unknown }) {
  const cfg = config as {
    src?: string;
    title?: string;
    aspectRatio?: '16:9' | '4:3' | '1:1';
    allowFullscreen?: boolean;
  } | null;
  const src = cfg?.src?.trim() ?? '';
  if (!src) return EMPTY_HINT;

  const title = cfg?.title?.trim() ?? '';
  const ratio = cfg?.aspectRatio ?? '16:9';
  const fullscreen = cfg?.allowFullscreen ?? false;

  return (
    <dl className="space-y-1">
      <Field label="URL">
        <span className="font-mono text-xs">{src}</span>
      </Field>
      <Field label="제목">
        {title || <span className="text-muted-foreground">—</span>}
      </Field>
      <Field label="비율">{ratio}</Field>
      <Field label="전체화면">{fullscreen ? '허용' : '비허용'}</Field>
    </dl>
  );
}

function renderBlock(block: PageBlockListItem) {
  switch (block.blockType) {
    case 'RICH_TEXT':
      return <RichTextBlockContent config={block.configJson} />;
    case 'HTML':
      return <HtmlBlockContent config={block.configJson} />;
    case 'IMAGE':
      return <ImageBlockContent config={block.configJson} />;
    case 'IFRAME':
      return <IframeBlockContent config={block.configJson} />;
    default:
      return null;
  }
}

interface BlockContentViewProps {
  blocks: PageBlockListItem[];
}

/**
 * 서브페이지 뷰 페이지의 "콘텐츠" 카드 — 블록 순서대로 입력 항목을 표시.
 *
 * - RICH_TEXT: admin용 Tiptap → HTML 렌더 (게시글 뷰와 동일 방식)
 * - HTML: Monaco Editor read-only
 * - IMAGE: 작은 썸네일 + 필드 목록
 * - IFRAME: 필드 목록 (실제 iframe 임베드 없음)
 * - 숨김 블록은 opacity-60 + (숨김) 배지
 * - 실제 공개 웹과 동일한 스타일 렌더는 상단 [미리보기] 버튼에서 확인
 */
export function BlockContentView({ blocks }: BlockContentViewProps) {
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const isHidden = !block.isVisible;
        const Icon = BLOCK_TYPE_ICONS[block.blockType];

        return (
          <section
            key={block.id}
            className={`overflow-hidden rounded-lg border bg-card shadow-card ${
              isHidden ? 'opacity-60' : ''
            }`}
          >
            <header className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              >
                {i + 1}
              </span>
              <Badge variant="secondary" className="h-6 gap-1.5 px-2 text-xs">
                <Icon aria-hidden />
                <span className="font-semibold">
                  {BLOCK_TYPE_LABELS[block.blockType]}
                </span>
              </Badge>
              {isHidden && (
                <Badge variant="outline" className="h-6 gap-1 text-muted-foreground">
                  <EyeOff aria-hidden />
                  숨김
                </Badge>
              )}
            </header>
            <div className="p-4">{renderBlock(block)}</div>
          </section>
        );
      })}
    </div>
  );
}
