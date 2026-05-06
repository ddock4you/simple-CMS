'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, FolderOpen, Layout, ListTree, Search } from 'lucide-react';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/shadcn/command';
import { Button } from '@/shared/ui/shadcn/button';
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
  const [submittedQuery, setSubmittedQuery] = useState('');

  useKeyboardShortcut('mod+k', () => setOpen((prev) => !prev));

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery('');
      setSubmittedQuery('');
    }
  }, []);

  const { data, isFetching } = useQuery({
    ...quickSearchOptions(submittedQuery),
    enabled: submittedQuery.trim().length > 0,
  });

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

  const handleSubmit = useCallback(() => {
    setSubmittedQuery(query.trim());
  }, [query]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      setSubmittedQuery('');
      router.push(href);
    },
    [router],
  );

  // Enter 키 분기: 입력값이 마지막 검색어와 다를 때만 검색 실행
  // 같을 때는 cmdk 기본 동작(항목 선택)에 위임
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && query.trim() !== submittedQuery) {
        e.preventDefault();
        e.stopPropagation();
        setSubmittedQuery(query.trim());
      }
    },
    [query, submittedQuery],
  );

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="검색어를 입력하세요..."
          value={query}
          onValueChange={setQuery}
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-center justify-end border-b px-3 py-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSubmit}
            className="h-7 text-xs"
          >
            <Search className="size-3.5" />
            검색
          </Button>
        </div>
        <CommandList>
          {submittedQuery.trim().length === 0 ? (
            <div className="space-y-3 px-3 py-6">
              <p className="text-xs text-muted-foreground">
                제목 또는 slug를 입력하고 Enter 또는 [검색]을 누르세요.
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
