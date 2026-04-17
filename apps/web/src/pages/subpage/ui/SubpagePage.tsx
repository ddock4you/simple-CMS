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
import { SubpageSideNavigation } from '@/widgets/subpage-sidebar/ui/SubpageSideNavigation';

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
      <KoglFooter cclType={subpage.cclType} cclAi={subpage.cclAi} />
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
            <SubpageArticle subpage={previewSubpage} showHidden />
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
      <SubpageArticle subpage={subpage} showHidden={false} />
    </SubpageLayout>
  );
}
