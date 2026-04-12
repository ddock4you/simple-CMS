import { notFound } from 'next/navigation';

import { getPublishedSubpage } from '@/entities/subpage/api/getSubpage';
import { renderTiptapContent } from '@/shared/lib/renderContent';
import { TiptapContent } from '@/shared/ui/TiptapContent';

interface SubpagePageProps {
  slug: string;
}

export async function SubpagePage({ slug }: SubpagePageProps) {
  const subpage = await getPublishedSubpage(slug);

  if (!subpage) {
    notFound();
  }

  const contentHtml = renderTiptapContent(subpage.contentJson);

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
        {contentHtml ? (
          <TiptapContent html={contentHtml} />
        ) : (
          <p className="empty-content">콘텐츠가 준비 중입니다.</p>
        )}
      </article>
    </div>
  );
}
