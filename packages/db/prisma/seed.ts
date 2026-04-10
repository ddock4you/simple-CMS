import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { hash } from 'bcryptjs';

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const FULL_PERMISSIONS = {
  dashboard: { read: true },
  subpages: { create: true, read: true, update: true, delete: true },
  boards: { create: true, read: true, update: true, delete: true },
  posts: { create: true, read: true, update: true, delete: true },
  navigation: { create: true, read: true, update: true, delete: true },
  home: { create: true, read: true, update: true, delete: true },
  users: { create: true, read: true, update: true, delete: true },
  roles: { create: true, read: true, update: true, delete: true },
  auditLogs: { read: true },
  errorLogs: { read: true, update: true },
  settings: { read: true, update: true },
};

const DEFAULT_PERMISSIONS = {
  dashboard: { read: true },
  subpages: { read: true },
  boards: { read: true },
  posts: { create: true, read: true, update: true },
};

async function main() {
  // 1. System role (총괄 관리자)
  const systemRole = await prisma.role.upsert({
    where: { name: '총괄 관리자' },
    update: {},
    create: {
      name: '총괄 관리자',
      description: '모든 권한을 보유한 시스템 관리자',
      isSystem: true,
      isDefault: false,
      permissions: FULL_PERMISSIONS,
    },
  });
  console.log(`✓ Role: ${systemRole.name} (isSystem: ${systemRole.isSystem})`);

  // 2. Default role (일반 관리자)
  const defaultRole = await prisma.role.upsert({
    where: { name: '일반 관리자' },
    update: {},
    create: {
      name: '일반 관리자',
      description: '가입 승인 시 자동 부여되는 기본 역할',
      isSystem: false,
      isDefault: true,
      permissions: DEFAULT_PERMISSIONS,
    },
  });
  console.log(
    `✓ Role: ${defaultRole.name} (isDefault: ${defaultRole.isDefault})`,
  );

  // 3. Initial admin user
  const username = process.env.INITIAL_ADMIN_USERNAME ?? 'admin';
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? 'changeme123';

  const existingUser = await prisma.user.findUnique({ where: { username } });

  if (existingUser) {
    console.log(`✓ User: "${username}" already exists, skipping`);
  } else {
    const hashedPassword = await hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name: '관리자',
        status: 'ACTIVE',
        roleId: systemRole.id,
      },
    });
    console.log(`✓ User: "${admin.username}" created (ACTIVE, 총괄 관리자)`);
  }

  // 4. Initial SiteSettings
  await prisma.siteSettings.upsert({
    where: { key: 'CONCURRENT_LOGIN_ENABLED' },
    update: {},
    create: {
      key: 'CONCURRENT_LOGIN_ENABLED',
      value: 'true',
      description: '동시 로그인 허용 여부',
    },
  });
  console.log('✓ SiteSettings: CONCURRENT_LOGIN_ENABLED = true');

  console.log('\nSeed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
