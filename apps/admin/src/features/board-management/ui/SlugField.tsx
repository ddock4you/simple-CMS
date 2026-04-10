'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { generateSlug } from '@simple-cms/editor';

import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

interface SlugFieldProps {
  title: string;
  value: string;
  onChange: (slug: string) => void;
  isPublic: boolean;
  savedSlug?: string;
}

export function SlugField({
  title,
  value,
  onChange,
  isPublic,
  savedSlug,
}: SlugFieldProps) {
  const manuallyEdited = useRef(false);

  useEffect(() => {
    if (!manuallyEdited.current && title) {
      const generated = generateSlug(title);
      if (generated) {
        onChange(generated);
      }
    }
  }, [title, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    manuallyEdited.current = true;
    onChange(e.target.value);
  };

  const showWarning =
    isPublic && savedSlug && value !== savedSlug;

  return (
    <div className="space-y-2">
      <Label htmlFor="slug">Slug</Label>
      <Input
        id="slug"
        value={value}
        onChange={handleChange}
        placeholder="url-friendly-slug"
      />
      {showWarning && (
        <p className="flex items-center gap-1 text-sm text-amber-600">
          <AlertTriangle className="size-4" />
          공개 게시판의 slug를 변경하면 기존 URL이 작동하지 않을 수 있습니다.
        </p>
      )}
    </div>
  );
}
