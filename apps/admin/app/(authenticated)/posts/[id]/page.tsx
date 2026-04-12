import PostViewPage from '@/pages/post-management/ui/PostViewPage';

export default async function ViewPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostViewPage id={id} />;
}
