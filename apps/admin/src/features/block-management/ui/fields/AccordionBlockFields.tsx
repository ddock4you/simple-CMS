'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';

import type { AccordionBlockConfigData } from '../../model/blockSchemas';

type AccordionItem = AccordionBlockConfigData['items'][number];

interface AccordionBlockFieldsProps {
  value: AccordionBlockConfigData;
  onChange: (next: AccordionBlockConfigData) => void;
}

const MAX_ITEMS = 50;

const EMPTY_ITEM: AccordionItem = {
  title: '',
  body: '',
};

function normalizeItems(value: AccordionBlockConfigData): AccordionItem[] {
  return value.items.length > 0 ? value.items : [{ ...EMPTY_ITEM }];
}

export function AccordionBlockFields({
  value,
  onChange,
}: AccordionBlockFieldsProps) {
  const items = normalizeItems(value);

  const updateItem = (index: number, next: AccordionItem) => {
    onChange({
      ...value,
      items: items.map((item, i) => (i === index ? next : item)),
    });
  };

  const addItem = () => {
    if (items.length >= MAX_ITEMS) return;
    onChange({ ...value, items: [...items, { ...EMPTY_ITEM }] });
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange({ ...value, items: next.length > 0 ? next : [{ ...EMPTY_ITEM }] });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    onChange({ ...value, items: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="block-accordion-heading">블록 제목 (선택)</Label>
        <Input
          id="block-accordion-heading"
          value={value.heading ?? ''}
          onChange={(e) => onChange({ ...value, heading: e.target.value })}
          placeholder="예: 자주묻는 질문"
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="block-accordion-description">설명 (선택)</Label>
        <Textarea
          id="block-accordion-description"
          value={value.description ?? ''}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="아코디언 목록 위에 표시할 설명"
          maxLength={500}
          rows={2}
        />
      </div>

      <div className="space-y-3 rounded-md border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="block-accordion-search"
            checked={value.enableSearch}
            onCheckedChange={(next) =>
              onChange({ ...value, enableSearch: next === true })
            }
          />
          <Label htmlFor="block-accordion-search" className="cursor-pointer">
            검색 입력 사용
          </Label>
        </div>

        {value.enableSearch && (
          <div className="space-y-2 pl-6">
            <Label htmlFor="block-accordion-search-placeholder">
              검색 placeholder
            </Label>
            <Input
              id="block-accordion-search-placeholder"
              value={value.searchPlaceholder ?? ''}
              onChange={(e) =>
                onChange({ ...value, searchPlaceholder: e.target.value })
              }
              placeholder="검색어를 입력해주세요."
              maxLength={100}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="block-accordion-default-open"
            checked={value.defaultOpenFirst}
            onCheckedChange={(next) =>
              onChange({ ...value, defaultOpenFirst: next === true })
            }
          />
          <Label htmlFor="block-accordion-default-open" className="cursor-pointer">
            첫 번째 항목을 기본으로 열기
          </Label>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-medium">아코디언 항목</h3>
          <p className="text-xs text-muted-foreground">
            공개 웹에서 KRDS 아코디언으로 표시됩니다. 최대 {MAX_ITEMS}개까지 등록할 수 있습니다.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addItem}
          disabled={items.length >= MAX_ITEMS}
        >
          <Plus className="size-4" />
          항목 추가
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <section key={index} className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-medium">항목 {index + 1}</h4>
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
                <Label htmlFor={`block-accordion-title-${index}`}>
                  제목 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`block-accordion-title-${index}`}
                  value={item.title}
                  onChange={(e) =>
                    updateItem(index, { ...item, title: e.target.value })
                  }
                  placeholder="예: 회원가입은 어떻게 하나요?"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`block-accordion-body-${index}`}>
                  내용 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id={`block-accordion-body-${index}`}
                  value={item.body}
                  onChange={(e) =>
                    updateItem(index, { ...item, body: e.target.value })
                  }
                  placeholder="펼쳤을 때 표시할 내용을 입력하세요. 줄바꿈은 공개 웹에 유지됩니다."
                  maxLength={5000}
                  rows={5}
                />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
