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
} from '@/shared/ui/Select';

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
          type="text"
          value={value.src}
          onChange={(e) => onChange({ ...value, src: e.target.value })}
          placeholder="YouTube/Vimeo URL 또는 Google Maps iframe embed 코드"
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground">
          YouTube 시청/shorts/youtu.be, Vimeo 영상 URL, Google Maps iframe 코드를
          붙여넣으면 저장 시 임베드 URL로 정리됩니다. (허용 도메인:{' '}
          {IFRAME_ALLOWED_HOSTS.join(', ')})
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
        <p className="text-xs text-muted-foreground">
          높이를 지정하지 않은 영상 임베드에 적용됩니다.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="block-iframe-height">데스크탑 높이(px)</Label>
        <Input
          id="block-iframe-height"
          type="number"
          inputMode="numeric"
          min={240}
          max={640}
          value={value.heightPx ?? ''}
          onChange={(e) => {
            const nextValue = e.target.value.trim();
            onChange({
              ...value,
              heightPx: nextValue === '' ? null : Number(nextValue),
            });
          }}
          placeholder="예: 350"
        />
        <p className="text-xs text-muted-foreground">
          Google 지도처럼 비율보다 고정 높이가 적합한 임베드에 사용합니다. 비워두면
          화면 비율을 사용합니다. Google 지도는 저장 시 기본 350px이 적용됩니다.
        </p>
        {errors?.heightPx && (
          <p className="text-xs text-destructive">{errors.heightPx}</p>
        )}
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
