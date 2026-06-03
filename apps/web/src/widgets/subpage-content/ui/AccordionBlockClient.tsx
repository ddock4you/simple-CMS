'use client';

import { useId, useMemo, useState } from 'react';
import { TextInput } from 'krds-react';
import { Search } from 'lucide-react';

export interface AccordionBlockItemView {
  title: string;
  body: string;
}

interface AccordionBlockClientProps {
  blockId: string;
  heading?: string | null;
  description?: string | null;
  enableSearch: boolean;
  searchPlaceholder?: string | null;
  defaultOpenFirst: boolean;
  items: AccordionBlockItemView[];
}

function normalizeForSearch(value: string) {
  return value.trim().toLocaleLowerCase('ko-KR');
}

export function AccordionBlockClient({
  blockId,
  heading,
  description,
  enableSearch,
  searchPlaceholder,
  defaultOpenFirst,
  items,
}: AccordionBlockClientProps) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(
    () => new Set(defaultOpenFirst && items.length > 0 ? [0] : []),
  );

  const normalizedQuery = normalizeForSearch(query);
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items.map((item, index) => ({ item, index }));
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) =>
        normalizeForSearch(`${item.title} ${item.body}`).includes(
          normalizedQuery,
        ),
      );
  }, [items, normalizedQuery]);

  const toggle = (index: number) => {
    setOpenIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <section className="subpage-block subpage-block-accordion">
      {(heading || description) && (
        <div className="mb-[20px] large:mb-[24px]">
          {heading && (
            <h2 className="m-0 text-[24px] leading-[1.4] font-bold text-[#1e2124] large:text-[28px]">
              {heading}
            </h2>
          )}
          {description && (
            <p className="mt-[8px] mb-0 whitespace-pre-wrap text-[17px] leading-[1.6] text-[#464c53]">
              {description}
            </p>
          )}
        </div>
      )}

      {enableSearch && (
        <div className="mb-[20px] large:mb-[24px]">
          <div className="relative w-full [&_.form-conts]:relative [&_.form-tit]:sr-only [&_input]:h-[56px] [&_input]:w-full [&_input]:rounded-[8px] [&_input]:border-[#58616a] [&_input]:bg-white [&_input]:px-[16px] [&_input]:pr-[48px] [&_input]:text-[19px] [&_input]:leading-[1.5] [&_input]:font-bold [&_input]:text-[#1e2124] [&_input::placeholder]:text-[#8a949e]">
            <TextInput
              id={inputId}
              name={`accordion-search-${blockId}`}
              type="search"
              label="아코디언 항목 검색"
              placeholder={searchPlaceholder || '검색어를 입력해주세요.'}
              value={query}
              onChange={setQuery}
              size="large"
            />
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-[16px] size-[24px] -translate-y-1/2 text-[#1e2124]"
              strokeWidth={2}
            />
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <p className="m-0 rounded-[10px] bg-[#f4f5f6] p-[24px] text-center text-[17px] leading-[1.5] text-[#464c53]">
          검색 결과가 없습니다.
        </p>
      ) : (
        <div className="krds-accordion">
          {filteredItems.map(({ item, index }) => {
            const open = openIndexes.has(index);
            const buttonId = `${blockId}-accordion-button-${index}`;
            const panelId = `${blockId}-accordion-panel-${index}`;

            return (
              <div
                key={`${blockId}-${index}`}
                className={`accordion-item${open ? ' active' : ''}`}
              >
                <button
                  id={buttonId}
                  type="button"
                  className={`btn-accordion${open ? ' active' : ''}`}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggle(index)}
                >
                  {item.title}
                </button>
                <div
                  id={panelId}
                  className="accordion-collapse"
                  role="region"
                  aria-labelledby={buttonId}
                  aria-hidden={!open}
                >
                  <div className="accordion-body whitespace-pre-wrap text-[17px] leading-[1.6] text-[#464c53]">
                    {item.body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
