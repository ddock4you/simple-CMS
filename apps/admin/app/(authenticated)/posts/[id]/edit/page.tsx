import PostEditPage from '@/pages/post-management/ui/PostEditPage';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostEditPage mode="edit" id={id} />;
}
