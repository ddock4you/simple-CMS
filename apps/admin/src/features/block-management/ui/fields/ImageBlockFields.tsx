'use client';

import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';

import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';

import type { ImageBlockConfigData } from '../../model/blockSchemas';

interface ImageBlockFieldsProps {
  value: ImageBlockConfigData;
  onChange: (next: ImageBlockConfigData) => void;
  errors?: Partial<Record<keyof ImageBlockConfigData, string>>;
}

export function ImageBlockFields({
  value,
  onChange,
  errors,
}: ImageBlockFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="block-image-url">이미지</Label>
        <ImageUrlInput
          id="block-image-url"
          value={value.imageUrl}
          onChange={(url) => onChange({ ...value, imageUrl: url })}
          mediaId={value.imageMediaId ?? null}
          onMediaIdChange={(mediaId) =>
            onChange({ ...value, imageMediaId: mediaId })
          }
          category="blocks"
          placeholder="https://... 또는 /uploads/..."
        />
        {errors?.imageUrl && (
          <p className="text-xs text-destructive">{errors.imageUrl}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="block-image-alt">
          대체 텍스트 (alt) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="block-image-alt"
          value={value.imageAlt}
          onChange={(e) => onChange({ ...value, imageAlt: e.target.value })}
          placeholder="이미지 설명"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          스크린리더 사용자를 위한 필수 항목입니다.
        </p>
        {errors?.imageAlt && (
          <p className="text-xs text-destructive">{errors.imageAlt}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="block-image-caption">캡션 (선택)</Label>
        <Textarea
          id="block-image-caption"
          value={value.caption ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              caption: e.target.value || null,
            })
          }
          placeholder="이미지 아래에 표시될 설명"
          maxLength={300}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="block-image-link">링크 URL (선택)</Label>
        <Input
          id="block-image-link"
          value={value.linkUrl ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              linkUrl: e.target.value || null,
            })
          }
          placeholder="https://... 또는 /p/..."
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground">
          입력 시 이미지 전체가 링크로 감싸집니다.
        </p>
      </div>
    </div>
  );
}
