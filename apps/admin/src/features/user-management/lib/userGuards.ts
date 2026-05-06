import { prisma } from '@simple-cms/db';

export class LastSystemAdminError extends Error {
  constructor() {
    super('마지막 총괄 관리자는 정지할 수 없습니다.');
    this.name = 'LastSystemAdminError';
  }
}

export async function assertNotLastSystemAdmin(targetUser: {
  role?: { isSystem: boolean } | null;
}): Promise<void> {
  if (!targetUser.role?.isSystem) return;
  const systemAdminCount = await prisma.user.count({
    where: { role: { isSystem: true }, status: 'ACTIVE' },
  });
  if (systemAdminCount <= 1) {
    throw new LastSystemAdminError();
  }
}
