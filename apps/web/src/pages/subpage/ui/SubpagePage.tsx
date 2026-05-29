import { notFound } from 'next/navigation';

import {
  getPublishedSubpage,
  getSubpageForPreview,
} from '@/entities/subpage/api/getSubpage';
import { getMenuBySlot } from '@/entities/navigation/api/getNavigation';
import { findHeaderBranchForPath } from '@/entities/navigation/lib/findHeaderBranchForPath';
import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { PreviewBanner } from '@/features/preview/ui/PreviewBanner';
import { getPreviewSession } from '@/shared/lib/previewSession';
import { SubpageBlockRenderer } from '@/widgets/subpage-content/ui/SubpageBlockRenderer';
import { KoglFooter } from '@/widgets/subpage-content/ui/KoglFooter';
import { SubpageFeedback } from '@/widgets/feedback/ui/SubpageFeedback';
import { SubpageSideNavigation } from '@/widgets/subpage-sidebar/ui/SubpageSideNavigation';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import type { CclType } from '@simple-cms/types';

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
    blockType: 'RICH_TEXT' | 'HTML' | 'IMAGE' | 'IFRAME';
    configJson: unknown;
    displayOrder: number;
    isVisible?: boolean;
  }>;
}

interface SideBranch {
  rootLabel: string;
  items: FilteredMenuItem[];
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
    <article id={`subpage-${subpage.id}`} className="pt-[32px] pb-[40px] large:pt-[40px] large:pb-[64px]">
      <header className="mb-[32px] border-b border-[#e4e4e4] pb-[20px]">
        <h1 className="mb-[12px] text-[32px] leading-[1.3] font-bold text-[#1e2124]">{subpage.title}</h1>
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
        <p className="py-[40px] text-center text-[#8a949e]">콘텐츠가 준비 중입니다.</p>
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

function SubpageLayout({
  branch,
  children,
}: {
  branch: SideBranch;
  children: React.ReactNode;
}) {
  return (
    <div className="page-container subpage-layout">
      <SubpageSideNavigation rootLabel={branch.rootLabel} items={branch.items} />
      <div className="subpage-content">{children}</div>
    </div>
  );
}

async function resolveSideBranch(
  slug: string,
  fallbackTitle: string,
): Promise<SideBranch> {
  const headerMenu = await getMenuBySlot('HEADER');
  const headerItems = headerMenu?.items ?? [];
  const branch = findHeaderBranchForPath(headerItems, `/p/${slug}`);
  if (branch) {
    return { rootLabel: branch.label, items: branch.children };
  }
  return { rootLabel: fallbackTitle, items: [] };
}

export async function SubpagePage({ slug }: SubpagePageProps) {
  const session = await getPreviewSession();

  if (session?.entityType === 'SUBPAGE') {
    const previewSubpage = await getSubpageForPreview(slug);
    if (previewSubpage && session.entityId === previewSubpage.id) {
      const branch = await resolveSideBranch(slug, previewSubpage.title);
      return (
        <>
          <PreviewBanner label="서브 페이지 미리보기" />
          <SubpageLayout branch={branch}>
            <SubpageArticle
              subpage={previewSubpage}
              showHidden
              previewMode
            />
          </SubpageLayout>
        </>
      );
    }
  }

  const subpage = await getPublishedSubpage(slug);
  if (!subpage) {
    notFound();
  }

  const branch = await resolveSideBranch(slug, subpage.title);
  return (
    <SubpageLayout branch={branch}>
      <SubpageArticle subpage={subpage} showHidden={false} previewMode={false} />
    </SubpageLayout>
  );
}
