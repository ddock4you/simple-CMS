'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/shared/ui/Button';

interface UrlFilterTabsOption<T extends string> {
  value: T;
  label: string;
}

interface UrlFilterTabsProps<T extends string> {
  options: UrlFilterTabsOption<T>[];
  currentValue: T;
  paramKey: string;
  defaultValue: T;
  basePath: string;
}

export function UrlFilterTabs<T extends string>({
  options,
  currentValue,
  paramKey,
  defaultValue,
  basePath,
}: UrlFilterTabsProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: T) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (value === defaultValue) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, value);
    }
    params.delete('page');
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={currentValue === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
