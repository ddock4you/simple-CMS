'use client';

import dynamic from 'next/dynamic';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/shadcn/tabs';

import type { HtmlBlockConfigData } from '../../model/blockSchemas';

/**
 * Monaco Editor는 브라우저 전용 모듈 (worker 사용).
 * next/dynamic으로 ssr: false 지정해야 Next.js RSC에서 안전.
 */
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false, loading: () => <EditorLoading /> },
);

function EditorLoading() {
  return (
    <div className="flex h-[400px] items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
      에디터 로딩 중...
    </div>
  );
}

const MAX_LENGTH = 100_000;

const monacoOptions = {
  minimap: { enabled: false },
  wordWrap: 'on',
  automaticLayout: true,
  fontSize: 13,
  tabSize: 2,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
} as const;

interface HtmlBlockFieldsProps {
  value: HtmlBlockConfigData;
  onChange: (next: HtmlBlockConfigData) => void;
  error?: string;
}

export function HtmlBlockFields({
  value,
  onChange,
  error,
}: HtmlBlockFieldsProps) {
  const html = value.html ?? '';
  const css = value.css ?? '';

  const handleHtmlChange = (next: string | undefined) => {
    onChange({ ...value, html: next ?? '' });
  };
  const handleCssChange = (next: string | undefined) => {
    const trimmed = (next ?? '').trim();
    onChange({ ...value, css: trimmed === '' ? null : (next ?? '') });
  };

  return (
    <div className="space-y-2">
      <Tabs defaultValue="html">
        <TabsList>
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="css">CSS</TabsTrigger>
        </TabsList>

        <TabsContent value="html" className="space-y-2 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              서버에서 DOMPurify sanitize 후 렌더됩니다.{' '}
              <code className="rounded bg-muted px-1">&lt;script&gt;</code>,
              이벤트 핸들러({`on*`}),{' '}
              <code className="rounded bg-muted px-1">javascript:</code> URL은
              자동 제거됩니다. iframe은 허용 호스트(YouTube/Vimeo)만.
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {html.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}자
            </span>
          </div>
          <div className="overflow-hidden rounded-md border">
            <MonacoEditor
              height="400px"
              defaultLanguage="html"
              value={html}
              onChange={handleHtmlChange}
              options={monacoOptions}
            />
          </div>
        </TabsContent>

        <TabsContent value="css" className="space-y-2 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              이 블록의 CSS는 같은 서브 페이지 전체에 적용됩니다 (페이지 스코프).
              모든 셀렉터는 서버에서 자동으로{' '}
              <code className="rounded bg-muted px-1">
                #subpage-{'{id}'}
              </code>{' '}
              스코프로 변환됩니다. 비워두면 적용되지 않습니다.
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {css.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}자
            </span>
          </div>
          <div className="overflow-hidden rounded-md border">
            <MonacoEditor
              height="400px"
              defaultLanguage="css"
              value={css}
              onChange={handleCssChange}
              options={monacoOptions}
            />
          </div>
        </TabsContent>
      </Tabs>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
