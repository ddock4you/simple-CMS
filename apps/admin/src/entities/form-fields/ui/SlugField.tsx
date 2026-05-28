'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { generateSlug } from '@simple-cms/editor';

import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';

interface SlugFieldProps {
  title: string;
  value: string;
  onChange: (slug: string) => void;
  savedSlug?: string;
  warningWhen?: boolean;
  warningMessage?: string;
}

export function SlugField({
  title,
  value,
  onChange,
  savedSlug,
  warningWhen,
  warningMessage,
}: SlugFieldProps) {
  const manuallyEdited = useRef(Boolean(savedSlug) || Boolean(value));

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

  const showWarning = warningWhen && savedSlug && value !== savedSlug;

  return (
    <div className="space-y-2">
      <Label htmlFor="slug">Slug</Label>
      <Input
        id="slug"
        value={value}
        onChange={handleChange}
        placeholder="url-friendly-slug"
      />
      {showWarning && warningMessage && (
        <p className="flex items-center gap-1 text-sm text-warning">
          <AlertTriangle className="size-4" />
          {warningMessage}
        </p>
      )}
    </div>
  );
}
