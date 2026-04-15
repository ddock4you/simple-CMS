'use client';

import { Label } from '@/shared/ui/shadcn/label';
import { TiptapEditor } from '@/shared/ui/TiptapEditor';

import type { RichTextBlockConfigData } from '../../model/blockSchemas';

interface RichTextBlockFieldsProps {
  value: RichTextBlockConfigData;
  onChange: (next: RichTextBlockConfigData) => void;
}

/**
 * RICH_TEXT 블록의 편집 필드 — 기존 Tiptap 에디터를 그대로 재사용한다.
 * 서브페이지 본문이 블록 중 하나로 통합되면서 이 컴포넌트가 기존 본문 편집 역할을 이어받았다.
 */
export function RichTextBlockFields({
  value,
  onChange,
}: RichTextBlockFieldsProps) {
  return (
    <div className="space-y-2">
      <Label>본문</Label>
      <TiptapEditor
        content={value.contentJson}
        onChange={(json) =>
          onChange({ contentJson: (json ?? {}) as object })
        }
      />
      <p className="text-xs text-muted-foreground">
        서식이 있는 본문을 작성합니다. 여러 RICH_TEXT 블록을 중간에 HTML·이미지·iframe
        블록과 섞어 배치할 수 있습니다.
      </p>
    </div>
  );
}
