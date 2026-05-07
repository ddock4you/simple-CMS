'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { FEEDBACK_RATING_LABELS } from '@simple-cms/types';

import { DatePicker } from '@/shared/ui/DatePicker';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';

type RatingFilter = 'ALL' | 'POSITIVE' | 'NEGATIVE';

interface SubpageOption {
  id: string;
  title: string;
  slug: string;
}

interface FeedbackFiltersProps {
  currentRating: RatingFilter;
  currentSubpageId: string | null;
  currentFrom: string | null;
  currentTo: string | null;
  currentQ: string | null;
  subpageOptions: SubpageOption[];
}

const RATING_OPTIONS: RatingFilter[] = ['ALL', 'POSITIVE', 'NEGATIVE'];

function formatRatingLabel(rating: RatingFilter): string {
  if (rating === 'ALL') return '평가 전체';
  return FEEDBACK_RATING_LABELS[rating];
}

export function FeedbackFilters({
  currentRating,
  currentSubpageId,
  currentFrom,
  currentTo,
  currentQ,
  subpageOptions,
}: FeedbackFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (!value || value === 'ALL') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (key !== 'page') params.delete('page');
    router.push(`/subpage-feedback?${params.toString()}`);
  };

  const updateDate = (key: 'from' | 'to', date: Date | undefined) => {
    updateParam(key, date ? toLocalDateString(date) : null);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateParam('q', String(formData.get('q') ?? '') || null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <DatePicker
          value={currentFrom ? new Date(currentFrom) : undefined}
          onChange={(d) => updateDate('from', d)}
          placeholder="시작일"
        />
        <span className="text-muted-foreground">~</span>
        <DatePicker
          value={currentTo ? new Date(currentTo) : undefined}
          onChange={(d) => updateDate('to', d)}
          placeholder="종료일"
        />

        <Select
          value={currentRating}
          onValueChange={(v) => updateParam('rating', v)}
        >
          <SelectTrigger className="w-[130px]">
            <span>{formatRatingLabel(currentRating)}</span>
          </SelectTrigger>
          <SelectContent>
            {RATING_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {formatRatingLabel(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentSubpageId ?? 'ALL'}
          onValueChange={(v) => updateParam('subpageId', v === 'ALL' ? null : v)}
        >
          <SelectTrigger className="w-[220px]">
            <span>
              {currentSubpageId
                ? (subpageOptions.find((o) => o.id === currentSubpageId)
                    ?.title ?? '서브페이지')
                : '서브페이지 전체'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">서브페이지 전체</SelectItem>
            {subpageOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <Input
          name="q"
          placeholder="코멘트 검색"
          defaultValue={currentQ ?? ''}
          className="w-[280px]"
        />
        <Button type="submit" variant="outline" size="sm">검색</Button>
      </form>
    </div>
  );
}

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
