import BoardViewPage from '@/pages/board-management/ui/BoardViewPage';

export default async function ViewBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoardViewPage id={id} />;
}
