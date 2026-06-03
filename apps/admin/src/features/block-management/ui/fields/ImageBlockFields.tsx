'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { IMAGE_BLOCK_MAX_ITEMS } from '@simple-cms/types';

import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';

import type { ImageBlockConfigData } from '../../model/blockSchemas';

type ImageBlockItem = NonNullable<ImageBlockConfigData['items']>[number];

interface ImageBlockFieldsProps {
  value: ImageBlockConfigData;
  onChange: (next: ImageBlockConfigData) => void;
  errors?: Partial<Record<keyof ImageBlockConfigData, string>>;
}

const EMPTY_ITEM: ImageBlockItem = {
  imageUrl: '',
  imageAlt: '',
  imageMediaId: null,
  caption: null,
  linkUrl: null,
};

function getImageItems(value: ImageBlockConfigData): ImageBlockItem[] {
  if (Array.isArray(value.items) && value.items.length > 0) return value.items;
  if (value.imageUrl || value.imageAlt || value.imageMediaId) {
    return [
      {
        imageUrl: value.imageUrl ?? '',
        imageAlt: value.imageAlt ?? '',
        imageMediaId: value.imageMediaId ?? null,
        caption: value.caption ?? null,
        linkUrl: value.linkUrl ?? null,
      },
    ];
  }
  return [{ ...EMPTY_ITEM }];
}

function toConfig(items: ImageBlockItem[]): ImageBlockConfigData {
  const normalized = items.map((item) => ({
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
    imageMediaId: item.imageMediaId ?? null,
    caption: item.caption ?? null,
    linkUrl: item.linkUrl ?? null,
  }));

  return {
    items: normalized,
    ...(normalized[0] ?? EMPTY_ITEM),
  };
}

export function ImageBlockFields({
  value,
  onChange,
  errors,
}: ImageBlockFieldsProps) {
  const items = getImageItems(value);

  const updateItem = (index: number, next: ImageBlockItem) => {
    onChange(toConfig(items.map((item, i) => (i === index ? next : item))));
  };

  const addItem = () => {
    if (items.length >= IMAGE_BLOCK_MAX_ITEMS) return;
    onChange(toConfig([...items, { ...EMPTY_ITEM }]));
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(toConfig(next.length > 0 ? next : [{ ...EMPTY_ITEM }]));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    onChange(toConfig(next));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-medium">이미지 목록</h3>
          <p className="text-xs text-muted-foreground">
            1장이면 단일 이미지로, 2장 이상이면 공개 웹에서 슬라이더로 표시됩니다.
            최대 {IMAGE_BLOCK_MAX_ITEMS}장까지 등록할 수 있습니다.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addItem}
          disabled={items.length >= IMAGE_BLOCK_MAX_ITEMS}
        >
          <Plus className="size-4" />
          이미지 추가
        </Button>
      </div>
      {errors?.items && <p className="text-xs text-destructive">{errors.items}</p>}

      <div className="space-y-4">
        {items.map((item, index) => (
          <section key={index} className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-medium">이미지 {index + 1}</h4>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp className="size-4" />
                  위로
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                >
                  <ArrowDown className="size-4" />
                  아래로
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="size-4" />
                  삭제
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`block-image-url-${index}`}>이미지</Label>
                <ImageUrlInput
                  id={`block-image-url-${index}`}
                  value={item.imageUrl}
                  mediaId={item.imageMediaId ?? null}
                  onChange={(next) =>
                    updateItem(index, {
                      ...item,
                      imageUrl: next.url,
                      imageMediaId: next.mediaId,
                    })
                  }
                  category="blocks"
                  placeholder="https://... 또는 /uploads/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`block-image-alt-${index}`}>
                  대체 텍스트 (alt) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`block-image-alt-${index}`}
                  value={item.imageAlt}
                  onChange={(e) =>
                    updateItem(index, { ...item, imageAlt: e.target.value })
                  }
                  placeholder="이미지 설명"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  스크린리더 사용자를 위한 필수 항목입니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`block-image-caption-${index}`}>캡션 (선택)</Label>
                <Textarea
                  id={`block-image-caption-${index}`}
                  value={item.caption ?? ''}
                  onChange={(e) =>
                    updateItem(index, {
                      ...item,
                      caption: e.target.value || null,
                    })
                  }
                  placeholder="이미지 아래에 표시될 설명"
                  maxLength={300}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`block-image-link-${index}`}>링크 URL (선택)</Label>
                <Input
                  id={`block-image-link-${index}`}
                  value={item.linkUrl ?? ''}
                  onChange={(e) =>
                    updateItem(index, {
                      ...item,
                      linkUrl: e.target.value || null,
                    })
                  }
                  placeholder="https://... 또는 /p/..."
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">
                  입력 시 해당 이미지만 링크로 감싸집니다.
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
