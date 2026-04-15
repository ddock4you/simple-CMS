import { notFound } from 'next/navigation';

import { getPublishedSubpage } from '@/entities/subpage/api/getSubpage';
import { SubpageBlockRenderer } from '@/widgets/subpage-content/ui/SubpageBlockRenderer';

interface SubpagePageProps {
  slug: string;
}

export async function SubpagePage({ slug }: SubpagePageProps) {
  const subpage = await getPublishedSubpage(slug);

  if (!subpage) {
    notFound();
  }

  const hasBlocks = subpage.blocks.length > 0;

  return (
    <div className="page-container">
      <article className="subpage-article">
        <header className="subpage-header">
          <h1 className="subpage-title">{subpage.title}</h1>
          {subpage.publishedAt && (
            <time
              className="subpage-date"
              dateTime={subpage.publishedAt.toISOString()}
            >
              {subpage.publishedAt.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
        </header>
        {hasBlocks ? (
          <SubpageBlockRenderer blocks={subpage.blocks} />
        ) : (
          <p className="empty-content">콘텐츠가 준비 중입니다.</p>
        )}
      </article>
    </div>
  );
}
