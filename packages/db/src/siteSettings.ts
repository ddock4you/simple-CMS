import { prisma } from './client';

// SiteSettings는 시연 모드 도입(Step 3)으로 글로벌 @unique(key) → @@unique([sessionId, key])로 전환됨.
// findUnique({ where: { key } })는 더 이상 타입에 맞지 않아 findFirst로 변환.
// extension이 sessionId를 자동 주입하므로 호출 코드는 변경 없이 동작.
// upsert는 demo extension에서 안전 처리가 어려워 명시적 findFirst → update | create 분기로 분리.

export async function getSiteSetting(key: string): Promise<string | null> {
  const setting = await prisma.siteSettings.findFirst({ where: { key } });
  return setting?.value ?? null;
}

export async function setSiteSetting(
  key: string,
  value: string,
  description?: string,
): Promise<void> {
  const existing = await prisma.siteSettings.findFirst({ where: { key } });
  if (existing) {
    await prisma.siteSettings.update({
      where: { id: existing.id },
      data: { value },
    });
  } else {
    await prisma.siteSettings.create({
      data: { key, value, description },
    });
  }
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
