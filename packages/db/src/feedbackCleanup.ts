import { prisma } from './client';

const DEFAULT_RETENTION_DAYS = 365;

export async function cleanupOldFeedback(
  retentionDays: number = DEFAULT_RETENTION_DAYS,
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.subpageFeedback.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
