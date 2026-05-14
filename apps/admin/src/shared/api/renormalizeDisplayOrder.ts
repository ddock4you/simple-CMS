import { prisma } from '@simple-cms/db';

type SupportedModel =
  | 'subpage'
  | 'pageBlock'
  | 'homePopup'
  | 'homeSection'
  | 'post'
  | 'navigationMenuItem';

export async function renormalizeDisplayOrder({
  model,
  where = {},
  orderBy,
}: {
  model: SupportedModel;
  where?: Record<string, unknown>;
  orderBy?: Array<Record<string, string>>;
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const defaultOrderBy = [{ displayOrder: 'asc' }, { updatedAt: 'desc' }];

  const items: { id: string }[] = await db[model].findMany({
    where,
    orderBy: orderBy ?? defaultOrderBy,
    select: { id: true },
  });

  for (let i = 0; i < items.length; i++) {
    await db[model].update({
      where: { id: items[i].id },
      data: { displayOrder: i },
    });
  }
}
