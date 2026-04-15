'use client';

import dynamic from 'next/dynamic';

import { Label } from '@/shared/ui/shadcn/label';

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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="html-editor">HTML 본문</Label>
        <span className="text-xs text-muted-foreground">
          {value.html.length.toLocaleString()} / 50,000자
        </span>
      </div>
      <div className="overflow-hidden rounded-md border">
        <MonacoEditor
          height="400px"
          defaultLanguage="html"
          value={value.html}
          onChange={(next) => onChange({ html: next ?? '' })}
          options={{
            minimap: { enabled: false },
            wordWrap: 'on',
            automaticLayout: true,
            fontSize: 13,
            tabSize: 2,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        서버에서 DOMPurify로 sanitize 후 렌더됩니다.{' '}
        <code className="rounded bg-muted px-1">&lt;script&gt;</code>,
        이벤트 핸들러({`on*`}) 등은 자동 제거됩니다.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
