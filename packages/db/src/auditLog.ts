import type { AuditAction, AuditEntityType, Prisma } from './generated/prisma/client';

import { prisma } from './client';

interface AuditLogInput {
  action: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  entityTitle?: string;
  changes?: Prisma.InputJsonValue | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        entityTitle: input.entityTitle ?? null,
        changes: input.changes ?? undefined,
        userId: input.userId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error('[AuditLog] Failed to write audit log:', error);
  }
}
