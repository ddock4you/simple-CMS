import { notFound } from 'next/navigation';

import type { CclType } from '@simple-cms/types';

import { resolveContentNavigation } from '@/entities/navigation/lib/resolveContentNavigation';
import {
  getPublishedSubpage,
  getSubpageForPreview,
} from '@/entities/subpage/api/getSubpage';
import { PreviewBanner } from '@/features/preview/ui/PreviewBanner';
import { getPreviewSession } from '@/shared/lib/previewSession';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import {
  buildContentBreadcrumbItems,
  PublicContentLayout,
} from '@/widgets/content-layout/ui/PublicContentLayout';
import { KoglFooter } from '@/widgets/subpage-content/ui/KoglFooter';
import { SubpageBlockRenderer } from '@/widgets/subpage-content/ui/SubpageBlockRenderer';
import { SubpageFeedback } from '@/widgets/feedback/ui/SubpageFeedback';

interface SubpagePageProps {
  slug: string;
}

interface RenderSubpageInput {
  id: string;
  title: string;
  publishedAt: Date | null;
  cclType: CclType | null;
  cclAi: boolean;
  feedbackEnabled: boolean;
  blocks: Array<{
    id: string;
    blockType: 'RICH_TEXT' | 'HTML' | 'IMAGE' | 'IFRAME' | 'ACCORDION';
    configJson: unknown;
    displayOrder: number;
    isVisible?: boolean;
  }>;
}

function SubpageArticle({
  subpage,
  showHidden,
  previewMode,
}: {
  subpage: RenderSubpageInput;
  showHidden: boolean;
  previewMode: boolean;
}) {
  const hasBlocks = subpage.blocks.length > 0;
  return (
    // id="subpage-{id}"는 HTML 블록의 CSS 스코프(`#subpage-{id}` prefix)가 적용될 루트
    <article id={`subpage-${subpage.id}`} className="pb-[40px] large:pb-[64px]">
      <header className="mb-[32px] border-b border-[#e4e4e4] pb-[20px]">
        <h1 className="mb-[12px] text-[32px] leading-[1.3] font-bold text-[#1e2124]">
          {subpage.title}
        </h1>
        {subpage.publishedAt && (
          <time
            className="text-[14px] leading-[1.5] text-[#717171]"
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
        <p className="flex min-h-[180px] items-center justify-center rounded-[10px] bg-[#f4f5f6] p-[24px] text-center text-[16px] leading-[1.6] text-[#8a949e] large:min-h-[220px]">
          콘텐츠가 준비 중입니다.
        </p>
      )}
      <KoglFooter cclType={subpage.cclType} cclAi={subpage.cclAi} />
      <ErrorBoundary boundaryName="SubpageFeedback" fallback={null}>
        <SubpageFeedback
          subpageId={subpage.id}
          feedbackEnabled={subpage.feedbackEnabled}
          previewMode={previewMode}
        />
      </ErrorBoundary>
    </article>
  );
}

export async function SubpagePage({ slug }: SubpagePageProps) {
  const session = await getPreviewSession();

  if (session?.entityType === 'SUBPAGE') {
    const previewSubpage = await getSubpageForPreview(slug);
    if (previewSubpage && session.entityId === previewSubpage.id) {
      const branch = await resolveContentNavigation(
        `/p/${slug}`,
        previewSubpage.title,
      );
      return (
        <>
          <PreviewBanner label="서브 페이지 미리보기" />
          <PublicContentLayout
            breadcrumbItems={buildContentBreadcrumbItems(branch, {
              text: previewSubpage.title,
              href: `/p/${slug}`,
            })}
            navigationBranch={branch}
          >
            <SubpageArticle subpage={previewSubpage} showHidden previewMode />
          </PublicContentLayout>
        </>
      );
    }
  }

  const subpage = await getPublishedSubpage(slug);
  if (!subpage) {
    notFound();
  }

  const branch = await resolveContentNavigation(`/p/${slug}`, subpage.title);
  return (
    <PublicContentLayout
      breadcrumbItems={buildContentBreadcrumbItems(branch, {
        text: subpage.title,
        href: `/p/${slug}`,
      })}
      navigationBranch={branch}
    >
      <SubpageArticle
        subpage={subpage}
        showHidden={false}
        previewMode={false}
      />
    </PublicContentLayout>
  );
}
