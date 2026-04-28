import { createHash } from 'node:crypto';

import type { ErrorLevel, ErrorSource, Prisma } from './generated/prisma/client';

import { prisma } from './client';

export interface LogWebErrorInput {
  level: ErrorLevel;
  source: ErrorSource;
  message: string;
  stack?: string | null;
  url?: string | null;
  method?: string | null;
  statusCode?: number | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  referer?: string | null;
  digest?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

const MESSAGE_LIMIT = 2000;
const FINGERPRINT_MESSAGE_LIMIT = 200;
const FINGERPRINT_HEX_LENGTH = 16;

export function normalizeMessage(message: string): string {
  return message
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      '{uuid}',
    )
    .replace(/\b\d+\b/g, '{n}')
    .replace(/(['"])(?:\\.|(?!\1).)*\1/g, '{str}')
    .slice(0, FINGERPRINT_MESSAGE_LIMIT);
}

export function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  let pathname = url;
  try {
    const parsed = new URL(url, 'http://placeholder.local');
    pathname = parsed.pathname;
  } catch {
    // url이 이미 pathname 형태라면 그대로 사용
  }
  return pathname
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/{uuid}',
    )
    .replace(/\/\d+/g, '/{n}');
}

export function computeErrorFingerprint(
  source: ErrorSource,
  url: string | null | undefined,
  message: string,
): string {
  const canonical = `${source}:${normalizeUrl(url)}:${normalizeMessage(message)}`;
  return createHash('sha256')
    .update(canonical)
    .digest('hex')
    .slice(0, FINGERPRINT_HEX_LENGTH);
}

export async function logWebError(input: LogWebErrorInput): Promise<void> {
  try {
    const fingerprint = computeErrorFingerprint(
      input.source,
      input.url ?? null,
      input.message,
    );

    await prisma.errorLog.create({
      data: {
        level: input.level,
        source: input.source,
        message: input.message.slice(0, MESSAGE_LIMIT),
        stack: input.stack ?? null,
        url: input.url ?? null,
        method: input.method ?? null,
        statusCode: input.statusCode ?? null,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
        referer: input.referer ?? null,
        digest: input.digest ?? null,
        fingerprint,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error('[ErrorLog] Failed to write error log:', error);
  }
}

export async function cleanupErrorLogs(retentionDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.errorLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
