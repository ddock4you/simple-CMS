import BoardEditPage from '@/pages/board-management/ui/BoardEditPage';

export default async function EditBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoardEditPage mode="edit" id={id} />;
}
