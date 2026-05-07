'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import type { ErrorLevel, ErrorSource } from '@simple-cms/db';

import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { Label } from '@/shared/ui/shadcn/label';
import { DatePicker } from '@/shared/ui/DatePicker';
import { toKstDateString } from '@/shared/lib/kstDate';

import {
  LEVEL_LABELS,
  RESOLVED_LABELS,
  SOURCE_LABELS,
} from '../model/errorLogFilters';
import type {
  ErrorLevelFilter,
  ErrorSourceFilter,
  ResolvedFilter,
} from '../model/errorLogFilters';

interface ErrorLogFiltersProps {
  currentLevel: ErrorLevelFilter;
  currentSource: ErrorSourceFilter;
  currentResolved: ResolvedFilter;
  currentUrlPattern: string | null;
  currentGroupByFingerprint: boolean;
  currentFrom: string | null;
  currentTo: string | null;
}

const LEVEL_OPTIONS: ErrorLevelFilter[] = ['ALL', 'ERROR', 'WARN'];
const SOURCE_OPTIONS: ErrorSourceFilter[] = [
  'ALL',
  'SERVER_SSR',
  'SERVER_API',
  'SERVER_MIDDLEWARE',
  'CLIENT_REACT',
  'CLIENT_JS',
];
const RESOLVED_OPTIONS: ResolvedFilter[] = ['all', 'unresolved', 'resolved'];

export function ErrorLogFilters({
  currentLevel,
  currentSource,
  currentResolved,
  currentUrlPattern,
  currentGroupByFingerprint,
  currentFrom,
  currentTo,
}: ErrorLogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (!value || value === 'ALL' || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    router.push(`/error-logs?${params.toString()}`);
  };

  const updateDate = (key: 'from' | 'to', date: Date | undefined) => {
    updateParam(key, date ? toKstDateString(date) : null);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateParam('urlPattern', String(formData.get('urlPattern') ?? '') || null);
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
          value={currentLevel}
          onValueChange={(v) => updateParam('level', v)}
        >
          <SelectTrigger className="w-[130px]">
            <span>
              {currentLevel === 'ALL'
                ? '레벨 전체'
                : LEVEL_LABELS[currentLevel as ErrorLevel]}
            </span>
          </SelectTrigger>
          <SelectContent>
            {LEVEL_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === 'ALL' ? '레벨 전체' : LEVEL_LABELS[opt as ErrorLevel]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentSource}
          onValueChange={(v) => updateParam('source', v)}
        >
          <SelectTrigger className="w-[150px]">
            <span>
              {currentSource === 'ALL'
                ? '소스 전체'
                : SOURCE_LABELS[currentSource as ErrorSource]}
            </span>
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === 'ALL'
                  ? '소스 전체'
                  : SOURCE_LABELS[opt as ErrorSource]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentResolved}
          onValueChange={(v) => updateParam('resolved', v)}
        >
          <SelectTrigger className="w-[120px]">
            <span>{RESOLVED_LABELS[currentResolved]}</span>
          </SelectTrigger>
          <SelectContent>
            {RESOLVED_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {RESOLVED_LABELS[opt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Checkbox
            id="group-by-fingerprint"
            checked={currentGroupByFingerprint}
            onCheckedChange={(checked) =>
              updateParam('groupByFingerprint', checked ? 'true' : null)
            }
          />
          <Label htmlFor="group-by-fingerprint" className="text-sm">
            그룹 뷰
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form key={currentUrlPattern ?? ''} onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <Input
            name="urlPattern"
            placeholder="메시지 · URL 검색"
            defaultValue={currentUrlPattern ?? ''}
            className="w-[280px]"
          />
          <Button type="submit" variant="outline" size="sm">검색</Button>
        </form>
      </div>
    </div>
  );
}
