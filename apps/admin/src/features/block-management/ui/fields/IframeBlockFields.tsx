'use client';

import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';

import type { IframeBlockConfigData } from '../../model/blockSchemas';
import { IFRAME_ALLOWED_HOSTS } from '../../model/blockLabels';

interface IframeBlockFieldsProps {
  value: IframeBlockConfigData;
  onChange: (next: IframeBlockConfigData) => void;
  errors?: Partial<Record<keyof IframeBlockConfigData, string>>;
}

const ASPECT_RATIO_OPTIONS: IframeBlockConfigData['aspectRatio'][] = [
  '16:9',
  '4:3',
  '1:1',
];

export function IframeBlockFields({
  value,
  onChange,
  errors,
}: IframeBlockFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="block-iframe-src">
          iframe URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="block-iframe-src"
          type="url"
          value={value.src}
          onChange={(e) => onChange({ ...value, src: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground">
          YouTube 시청/shorts/youtu.be, Vimeo 영상 URL을 붙여넣으면 자동으로
          embed URL로 변환됩니다. (허용 도메인: {IFRAME_ALLOWED_HOSTS.join(', ')})
        </p>
        {errors?.src && (
          <p className="text-xs text-destructive">{errors.src}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="block-iframe-title">
          제목 (접근성){' '}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="block-iframe-title"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="예: 회사 소개 영상"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          스크린리더가 읽는 iframe 식별 텍스트입니다. WCAG 요구사항.
        </p>
        {errors?.title && (
          <p className="text-xs text-destructive">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="block-iframe-aspect">화면 비율</Label>
        <Select
          value={value.aspectRatio}
          onValueChange={(v) =>
            onChange({
              ...value,
              aspectRatio: v as IframeBlockConfigData['aspectRatio'],
            })
          }
        >
          <SelectTrigger id="block-iframe-aspect" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASPECT_RATIO_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="block-iframe-fullscreen"
          checked={value.allowFullscreen}
          onCheckedChange={(next) =>
            onChange({ ...value, allowFullscreen: next === true })
          }
        />
        <Label htmlFor="block-iframe-fullscreen" className="cursor-pointer">
          전체 화면 허용 (allowfullscreen)
        </Label>
      </div>
    </div>
  );
}
