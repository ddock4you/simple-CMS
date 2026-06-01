import { TiptapContent } from '@/shared/ui/TiptapContent';
import {
  buildContentBreadcrumbItems,
  type ContentNavigationBranch,
  PublicContentLayout,
} from '@/widgets/content-layout/ui/PublicContentLayout';

interface PostPageProps {
  post: {
    title: string;
    contentHtml: string | null;
    publishedAt: Date | null;
    author: { name: string } | null;
    board: { name: string; slug: string };
  };
  navigationBranch: ContentNavigationBranch;
}

export function PostPage({ post, navigationBranch }: PostPageProps) {
  const breadcrumbItems = buildContentBreadcrumbItems(navigationBranch, {
    text: post.title,
    href: '#',
  });

  return (
    <PublicContentLayout
      breadcrumbItems={breadcrumbItems}
      navigationBranch={navigationBranch}
    >
      <article className="pb-[40px] large:pb-[64px]">
        <header className="mb-[32px] border-b border-[#e4e4e4] pb-[20px]">
          <h1 className="mb-[12px] text-[28px] leading-[1.3] font-bold text-[#1e2124] medium:text-[32px]">
            {post.title}
          </h1>
          <div className="flex items-center gap-[12px] text-[14px] leading-[1.5] text-[#717171]">
            {post.author && (
              <span className="font-medium text-[#555555] after:ml-[12px] after:content-['·']">
                {post.author.name}
              </span>
            )}
            {post.publishedAt && (
              <time dateTime={post.publishedAt.toISOString()}>
                {post.publishedAt.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </div>
        </header>
        {post.contentHtml ? (
          <TiptapContent html={post.contentHtml} />
        ) : (
          <p className="py-[40px] text-center text-[#8a949e]">
            콘텐츠가 준비 중입니다.
          </p>
        )}
      </article>
    </PublicContentLayout>
  );
}
