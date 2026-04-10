import SubpageEditPage from '@/pages/subpage-management/ui/SubpageEditPage';

export default async function EditSubpagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SubpageEditPage mode="edit" id={id} />;
}
