'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Input } from '@/shared/ui/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/shadcn/select';

interface MediaFiltersProps {
  currentQ: string | null;
  currentMimeType: string | null;
  /** Picker처럼 경로 라우팅을 안 쓰는 경우 onChange로 핸들링 */
  basePath?: string;
  onChange?: (next: { q?: string | null; mimeType?: string | null }) => void;
}

const MIME_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'image', label: '이미지' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/gif', label: 'GIF' },
  { value: 'image/webp', label: 'WebP' },
  { value: 'image/svg+xml', label: 'SVG' },
];

export function MediaFilters({
  currentQ,
  currentMimeType,
  basePath = '/media',
  onChange,
}: MediaFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: 'q' | 'mimeType', value: string | null) => {
    if (onChange) {
      onChange({ [key]: value });
      return;
    }
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (!value || value === 'ALL') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    router.push(`${basePath}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateParam('q', String(formData.get('q') ?? '') || null);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <Input
          name="q"
          placeholder="파일명 / 대체 텍스트 검색"
          defaultValue={currentQ ?? ''}
          className="w-[260px]"
        />
      </form>

      <Select
        value={currentMimeType ?? 'ALL'}
        onValueChange={(v) => updateParam('mimeType', v)}
      >
        <SelectTrigger className="w-[160px]">
          <span>
            {MIME_OPTIONS.find((o) => o.value === (currentMimeType ?? 'ALL'))
              ?.label ?? '전체'}
          </span>
        </SelectTrigger>
        <SelectContent>
          {MIME_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
