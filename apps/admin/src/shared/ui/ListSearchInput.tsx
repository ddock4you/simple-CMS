'use client';

import { Search } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';

interface ListSearchInputProps {
  name?: string;
  placeholder?: string;
  defaultValue?: string;
}

export function ListSearchInput({
  name = 'q',
  placeholder = '검색',
  defaultValue = '',
}: ListSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const value = String(formData.get(name) ?? '').trim();

    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form key={defaultValue} onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-[220px]"
      />
      <Button type="submit" variant="outline" size="sm">
        <Search className="size-4" />
        검색
      </Button>
    </form>
  );
}
