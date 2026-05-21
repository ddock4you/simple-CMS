import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { hash } from 'bcryptjs';

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// 시연 모드(DEMO_MODE) 격리 인프라 도입 후 — 17개 모델은 sessionId NOT NULL,
// 운영 환경 row는 모두 sentinel '__PROD__'. seed는 운영 시드라 명시적으로 sentinel을 사용한다.
// (소스 의존성 회피를 위해 packages/db/src/demo/sessionContext의 PROD_SENTINEL 상수와 값을 동기화)
const PROD_SENTINEL = '__PROD__';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const FULL_PERMISSIONS = {
  dashboard: { read: true },
  subpages: { create: true, read: true, update: true, delete: true },
  'subpage-feedback': { read: true, delete: true },
  boards: { create: true, read: true, update: true, delete: true },
  posts: { create: true, read: true, update: true, delete: true },
  navigation: { create: true, read: true, update: true, delete: true },
  home: { create: true, read: true, update: true, delete: true },
  'home-popups': { create: true, read: true, update: true, delete: true },
  media: { create: true, read: true, update: true, delete: true },
  users: { create: true, read: true, update: true, delete: true },
  roles: { create: true, read: true, update: true, delete: true },
  auditLogs: { read: true },
  errorLogs: { read: true, update: true },
  settings: { read: true, update: true },
  'demo-snapshot': { read: true, create: true, update: true },
};

const DEFAULT_PERMISSIONS = {
  dashboard: { read: true },
  subpages: { read: true },
  'subpage-feedback': { read: true },
  boards: { read: true },
  posts: { create: true, read: true, update: true },
  media: { read: true, create: true },
};

async function main() {
  // 1. System role (총괄 관리자) — permissions는 항상 FULL로 동기화 (새 리소스 추가 시 반영)
  // composite @@unique([sessionId, name]) 사용 — sentinel '__PROD__'로 명시 (운영 시드)
  const systemRole = await prisma.role.upsert({
    where: { sessionId_name: { sessionId: PROD_SENTINEL, name: '총괄 관리자' } },
    update: { permissions: FULL_PERMISSIONS },
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
    where: { sessionId_name: { sessionId: PROD_SENTINEL, name: '일반 관리자' } },
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

  const existingUser = await prisma.user.findFirst({ where: { username } });

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
    where: {
      sessionId_key: { sessionId: PROD_SENTINEL, key: 'CONCURRENT_LOGIN_ENABLED' },
    },
    update: {},
    create: {
      key: 'CONCURRENT_LOGIN_ENABLED',
      value: 'true',
      description: '동시 로그인 허용 여부',
    },
  });
  console.log('✓ SiteSettings: CONCURRENT_LOGIN_ENABLED = true');

  // 5. Default NavigationMenu sets
  const menuSets: Array<{
    name: string;
    description: string;
    slots: ('HEADER' | 'FOOTER' | 'SIDEBAR')[];
  }> = [
    { name: 'Header Main', description: '헤더 메인 네비게이션', slots: ['HEADER'] },
    { name: 'Footer', description: '푸터 네비게이션', slots: ['FOOTER'] },
    { name: 'Quick Links', description: '빠른 링크 모음', slots: [] },
  ];

  for (const menu of menuSets) {
    const created = await prisma.navigationMenu.upsert({
      where: { sessionId_name: { sessionId: PROD_SENTINEL, name: menu.name } },
      update: { slots: menu.slots },
      create: menu,
    });
    console.log(`✓ NavigationMenu: ${created.name} (slots: ${created.slots.join(', ') || 'none'})`);
  }

  // 6. Initial HomeSections (6 fixed sections, idempotent)
  // sectionType은 unique 아님 → findFirst + create 패턴 (upsert 금지: 관리자 수정본 덮어쓰기 방지)
  const DEFAULT_SLIDE_OPTIONS = {
    showPrevNext: true,
    showPlayPause: false,
    showDots: true,
    autoPlay: false,
    autoPlayInterval: 5000,
  };

  const homeSections = [
    {
      sectionType: 'HERO' as const,
      title: '메인 히어로',
      displayOrder: 0,
      configJson: {
        slides: [],
        slideOptions: DEFAULT_SLIDE_OPTIONS,
      },
    },
    {
      sectionType: 'SUB_CAROUSEL' as const,
      title: '서브 캐러셀',
      displayOrder: 1,
      configJson: {
        tagline: null,
        mainHeading: '',
        subHeading: null,
        description: null,
        items: [],
        slideOptions: DEFAULT_SLIDE_OPTIONS,
      },
    },
    {
      sectionType: 'RECOMMENDED' as const,
      title: '추천 콘텐츠',
      displayOrder: 2,
      configJson: {
        heading: '추천 콘텐츠',
        description: null,
        items: [],
        slideOptions: DEFAULT_SLIDE_OPTIONS,
      },
    },
    {
      sectionType: 'SHORTCUT' as const,
      title: '바로가기',
      displayOrder: 3,
      configJson: { heading: '바로가기', description: null, items: [] },
    },
    {
      sectionType: 'LATEST_POSTS' as const,
      title: '최신 게시글',
      displayOrder: 4,
      configJson: {
        heading: '최신 게시글',
        description: null,
        boardId: null,
        limit: 5,
      },
    },
    {
      sectionType: 'CTA' as const,
      title: 'CTA 섹션',
      displayOrder: 5,
      configJson: {
        heading: '지금 시작하세요',
        description: null,
        buttonLabel: '자세히 보기',
        buttonUrl: '/',
      },
    },
    {
      sectionType: 'NOTICE' as const,
      title: '공지사항',
      displayOrder: 6,
      configJson: { heading: '공지사항', description: null, items: [] },
    },
  ];

  for (const section of homeSections) {
    const existing = await prisma.homeSection.findFirst({
      where: { sectionType: section.sectionType },
    });
    if (existing) {
      console.log(
        `✓ HomeSection: ${section.sectionType} already exists, skipping`,
      );
    } else {
      await prisma.homeSection.create({
        data: {
          sectionType: section.sectionType,
          title: section.title,
          displayOrder: section.displayOrder,
          configJson: section.configJson,
          isVisible: true,
        },
      });
      console.log(`✓ HomeSection: ${section.sectionType} created`);
    }
  }

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
