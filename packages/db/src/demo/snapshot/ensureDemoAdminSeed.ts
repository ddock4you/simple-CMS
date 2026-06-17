import { hash } from 'bcryptjs';

import { prisma } from '../../client';

import { SEED_SENTINEL } from '../sessionContext';
import { DEMO_ADMIN_USERNAME } from '../seedClone/constants';

import { DEMO_ADMIN_PASSWORD, DEMO_ADMIN_PERMISSIONS } from './constants';

export interface EnsureDemoAdminSeedResult {
  roleCreated: boolean;
  userCreated: boolean;
}

/**
 * Snapshot import may replace seed users with anonymized placeholder passwords.
 * Repair the canonical demo admin after all imported rows are committed.
 */
export async function ensureDemoAdminSeed(): Promise<EnsureDemoAdminSeedResult> {
  let roleCreated = false;
  let userCreated = false;

  let systemRole = await prisma.role.findFirst({
    where: { sessionId: SEED_SENTINEL, isSystem: true },
    orderBy: { id: 'asc' },
  });

  if (!systemRole) {
    systemRole = await prisma.role.create({
      data: {
        sessionId: SEED_SENTINEL,
        name: '총괄 관리자',
        description: '모든 권한을 보유한 시스템 관리자 (시연용)',
        permissions: DEMO_ADMIN_PERMISSIONS,
        isSystem: true,
        isDefault: false,
      },
    });
    roleCreated = true;
  } else {
    await prisma.role.update({
      where: { id: systemRole.id },
      data: {
        permissions: DEMO_ADMIN_PERMISSIONS,
        isSystem: true,
      },
    });
  }

  const password = await hash(DEMO_ADMIN_PASSWORD, 10);
  const existingDemoAdmin = await prisma.user.findFirst({
    where: { sessionId: SEED_SENTINEL, username: DEMO_ADMIN_USERNAME },
  });

  if (existingDemoAdmin) {
    await prisma.user.update({
      where: { id: existingDemoAdmin.id },
      data: {
        name: '시연 관리자',
        password,
        status: 'ACTIVE',
        roleId: systemRole.id,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        sessionId: SEED_SENTINEL,
        username: DEMO_ADMIN_USERNAME,
        password,
        name: '시연 관리자',
        status: 'ACTIVE',
        roleId: systemRole.id,
      },
    });
    userCreated = true;
  }

  return { roleCreated, userCreated };
}
