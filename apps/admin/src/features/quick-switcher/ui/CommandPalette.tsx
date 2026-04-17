'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { useQuery } from '@tanstack/react-query';
import { FileText, FolderOpen, Layout, ListTree } from 'lucide-react';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/shadcn/command';
import { useKeyboardShortcut } from '@/shared/lib/useKeyboardShortcut';

import { quickSearchOptions } from '../api/quickSearchQueries';
import type {
  QuickSearchResult,
  QuickSearchType,
} from '../api/quickSearchTypes';

const TYPE_LABELS: Record<QuickSearchType, string> = {
  subpage: '서브 페이지',
  post: '게시글',
  board: '게시판',
  menu: '메뉴 항목',
};

const TYPE_ICONS: Record<QuickSearchType, React.ComponentType<{ className?: string }>> =
  {
    subpage: Layout,
    post: FileText,
    board: FolderOpen,
    menu: ListTree,
  };

const TYPE_ORDER: QuickSearchType[] = ['subpage', 'post', 'board', 'menu'];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 200);

  useKeyboardShortcut('mod+k', () => setOpen((prev) => !prev));

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  }, []);

  const { data, isFetching } = useQuery(quickSearchOptions(debouncedQuery));

  const grouped = useMemo(() => {
    const map = new Map<QuickSearchType, QuickSearchResult[]>();
    for (const result of data?.results ?? []) {
      const list = map.get(result.type) ?? [];
      list.push(result);
      map.set(result.type, list);
    }
    return TYPE_ORDER.filter((t) => (map.get(t)?.length ?? 0) > 0).map((t) => ({
      type: t,
      items: map.get(t) ?? [],
    }));
  }, [data]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router],
  );

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="검색어를 입력하세요..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {debouncedQuery.trim().length === 0 ? (
            <div className="space-y-3 px-3 py-6">
              <p className="text-xs text-muted-foreground">
                제목 또는 slug를 입력하세요. 다음 항목을 한 번에 검색합니다.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_ORDER.map((type) => {
                  const Icon = TYPE_ICONS[type];
                  return (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                    >
                      <Icon className="size-3.5" />
                      {TYPE_LABELS[type]}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : isFetching && grouped.length === 0 ? (
            <CommandEmpty>검색 중...</CommandEmpty>
          ) : grouped.length === 0 ? (
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
          ) : (
            grouped.map((group) => {
              const Icon = TYPE_ICONS[group.type];
              return (
                <CommandGroup
                  key={group.type}
                  heading={TYPE_LABELS[group.type]}
                >
                  {group.items.map((item) => (
                    <CommandItem
                      key={`${group.type}-${item.id}`}
                      value={`${group.type}:${item.id}:${item.title}`}
                      onSelect={() => handleSelect(item.href)}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        {item.subtitle && (
                          <span className="text-xs text-muted-foreground">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
