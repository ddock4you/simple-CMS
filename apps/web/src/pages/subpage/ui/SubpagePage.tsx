import { notFound } from 'next/navigation';

import {
  getPublishedSubpage,
  getSubpageForPreview,
} from '@/entities/subpage/api/getSubpage';
import { PreviewBanner } from '@/features/preview/ui/PreviewBanner';
import { getPreviewSession } from '@/shared/lib/previewSession';
import { SubpageBlockRenderer } from '@/widgets/subpage-content/ui/SubpageBlockRenderer';

interface SubpagePageProps {
  slug: string;
}

interface RenderSubpageInput {
  id: string;
  title: string;
  publishedAt: Date | null;
  blocks: Array<{
    id: string;
    blockType: 'RICH_TEXT' | 'HTML' | 'IMAGE' | 'IFRAME';
    configJson: unknown;
    displayOrder: number;
    isVisible?: boolean;
  }>;
}

function SubpageArticle({
  subpage,
  showHidden,
}: {
  subpage: RenderSubpageInput;
  showHidden: boolean;
}) {
  const hasBlocks = subpage.blocks.length > 0;
  return (
    // id="subpage-{id}"는 HTML 블록의 CSS 스코프(`#subpage-{id}` prefix)가 적용될 루트
    <article id={`subpage-${subpage.id}`} className="subpage-article">
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
        <SubpageBlockRenderer
          blocks={subpage.blocks}
          subpageId={subpage.id}
          showHidden={showHidden}
        />
      ) : (
        <p className="empty-content">콘텐츠가 준비 중입니다.</p>
      )}
    </article>
  );
}

export async function SubpagePage({ slug }: SubpagePageProps) {
  const session = await getPreviewSession();

  if (session?.entityType === 'SUBPAGE') {
    const previewSubpage = await getSubpageForPreview(slug);
    if (previewSubpage && session.entityId === previewSubpage.id) {
      return (
        <>
          <PreviewBanner label="서브 페이지 미리보기" />
          <div className="page-container">
            <SubpageArticle subpage={previewSubpage} showHidden />
          </div>
        </>
      );
    }
  }

  const subpage = await getPublishedSubpage(slug);
  if (!subpage) {
    notFound();
  }

  return (
    <div className="page-container">
      <SubpageArticle subpage={subpage} showHidden={false} />
    </div>
  );
}
