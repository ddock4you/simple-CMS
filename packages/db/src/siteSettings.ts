import { prisma } from './client';

export async function getSiteSetting(key: string): Promise<string | null> {
  const setting = await prisma.siteSettings.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function setSiteSetting(
  key: string,
  value: string,
  description?: string,
): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value, description },
  });
}

export async function deleteSiteSetting(key: string): Promise<void> {
  await prisma.siteSettings.deleteMany({ where: { key } });
}

export async function getSiteSettings(
  keys: string[],
): Promise<Record<string, string | null>> {
  const settings = await prisma.siteSettings.findMany({
    where: { key: { in: keys } },
  });
  const result: Record<string, string | null> = {};
  for (const key of keys) {
    result[key] = settings.find((s) => s.key === key)?.value ?? null;
  }
  return result;
}
