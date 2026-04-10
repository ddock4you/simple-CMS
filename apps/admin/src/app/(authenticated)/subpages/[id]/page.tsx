import SubpageViewPage from '@/pages/subpage-management/ui/SubpageViewPage';

export default async function ViewSubpagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SubpageViewPage id={id} />;
}
