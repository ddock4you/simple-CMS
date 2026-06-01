import Link from 'next/link';

export interface BoardSpotlightItem {
  title: string;
  href?: string | null;
  publishedAt: Date | string | null;
  description?: string | null;
}

export function BoardSpotlightFeaturedCard({
  item,
}: {
  item: BoardSpotlightItem;
}) {
  const content = (
    <article className="flex flex-col gap-[12px] rounded-[12px] border border-[#b1b8be] bg-white p-[20px] transition-colors group-hover:border-[#247b5c] large:flex-row large:items-center large:gap-[16px] large:p-[24px]">
      <span className="inline-flex h-[24px] w-fit items-center justify-center rounded-[4px] bg-[#f2fbf7] px-[8px] text-[13px] leading-none font-bold text-[#1e694e]">
        공지
      </span>
      <h3 className="m-0 flex-1 text-[17px] leading-[1.8] font-normal text-[#1e2124] group-hover:underline group-hover:underline-offset-4">
        {item.title}
      </h3>
      {item.publishedAt && (
        <time
          dateTime={toDateTime(item.publishedAt)}
          className="shrink-0 text-[17px] leading-[1.8] text-[#464c53]"
        >
          {formatDate(item.publishedAt)}
        </time>
      )}
    </article>
  );

  if (!item.href) return content;

  return (
    <Link href={item.href} className="group block text-inherit no-underline">
      {content}
    </Link>
  );
}

export function BoardSpotlightPostCard({ item }: { item: BoardSpotlightItem }) {
  const content = (
    <article className="flex h-full flex-col gap-[4px] rounded-[12px] border border-[#b1b8be] bg-white p-[20px] transition-colors group-hover:border-[#247b5c] large:gap-[8px] large:p-[24px]">
      <h3 className="m-0 line-clamp-2 text-[17px] leading-[1.5] font-bold text-[#1e2124] group-hover:underline group-hover:underline-offset-4">
        {item.title}
      </h3>
      {item.description ? (
        <p className="m-0 line-clamp-2 text-[17px] leading-[1.8] text-[#464c53]">
          {item.description}
        </p>
      ) : item.publishedAt ? (
        <time
          dateTime={toDateTime(item.publishedAt)}
          className="text-[17px] leading-[1.8] text-[#464c53]"
        >
          {formatDate(item.publishedAt)}
        </time>
      ) : null}
    </article>
  );

  if (!item.href) return content;

  return (
    <Link
      href={item.href}
      className="group block h-full text-inherit no-underline"
    >
      {content}
    </Link>
  );
}

function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime()))
    return typeof value === 'string' ? value : '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateTime(value: Date | string): string {
  return typeof value === 'string' ? value : value.toISOString();
}
