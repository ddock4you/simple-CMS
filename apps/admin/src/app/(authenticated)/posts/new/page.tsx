import PostEditPage from '@/pages/post-management/ui/PostEditPage';

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const defaultBoardId = (params.boardId as string) || undefined;
  return <PostEditPage mode="create" defaultBoardId={defaultBoardId} />;
}
