/**
 * 시연 모드 `__SEED__` row prefill 스크립트.
 *
 * `pnpm --filter @simple-cms/db db:demo-seed` 실행 시 sessionId='__SEED__'로 다음을 생성:
 *   - Role x2 (총괄/일반)
 *   - User x1 (demo_admin / demo_password, ACTIVE, 총괄 관리자)
 *   - SiteSettings x6 (동시 로그인 + 브랜딩 + 업로드)
 *   - NavigationMenu x2 (Header Main + Footer)
 *   - Board x1 (slug='notice')
 *   - Subpage x1 (slug='about', PUBLISHED)
 *   - PageBlock x1 (about Subpage의 RICH_TEXT 본문)
 *   - HomeSection x6 (운영 seed와 동일 6타입)
 *   - NavigationMenuItem x2 (about 링크를 Header + Footer에 배치)
 *
 * cloneSeedToSession이 이 17 row 세트를 매 시연 방문자의 새 sessionId로 in-memory remap 클론한다.
 *
 * 운영 seed(`prisma/seed.ts`)와 별개. 운영 환경에는 영향 0 — sessionId='__SEED__'는
 * 운영 코드 경로에서 자연스럽게 필터링됨 (모든 운영 row는 sessionId='__PROD__'). 멱등 — findFirst →
 * update | create 패턴(upsert 회피, 시연 모드 컨벤션).
 */
import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { hash } from 'bcryptjs';

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const SEED_SENTINEL = '__SEED__';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
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

const DEFAULT_SLIDE_OPTIONS = {
  showPrevNext: true,
  showPlayPause: false,
  showDots: true,
  autoPlay: false,
  autoPlayInterval: 5000,
};

async function main() {
  // ─── 1. Role x2 ────────────────────────────────────────
  const systemRole = await upsertRoleSeed('총괄 관리자', {
    description: '모든 권한을 보유한 시스템 관리자 (시연용)',
    isSystem: true,
    isDefault: false,
    permissions: FULL_PERMISSIONS,
  });
  console.log(`✓ Role: ${systemRole.name} (isSystem)`);

  const defaultRole = await upsertRoleSeed('일반 관리자', {
    description: '시연용 기본 역할',
    isSystem: false,
    isDefault: true,
    permissions: DEFAULT_PERMISSIONS,
  });
  console.log(`✓ Role: ${defaultRole.name} (isDefault)`);

  // ─── 2. User x1: demo_admin ────────────────────────────
  const demoAdmin = await upsertUserSeed({
    username: 'demo_admin',
    name: '시연 관리자',
    plainPassword: 'demo_password',
    roleId: systemRole.id,
  });
  console.log(`✓ User: ${demoAdmin.username} (ACTIVE, 총괄 관리자)`);

  // ─── 3. SiteSettings x6 ────────────────────────────────
  await upsertSiteSettingSeed(
    'CONCURRENT_LOGIN_ENABLED',
    'true',
    '동시 로그인 허용 여부',
  );
  await upsertSiteSettingSeed(
    'SITE_NAME',
    '시연 CMS',
    '사이트 이름 (헤더, 푸터, metadata title)',
  );
  await upsertSiteSettingSeed(
    'SITE_DESCRIPTION',
    'Simple CMS 시연용 사이트입니다.',
    '사이트 설명 (metadata description)',
  );
  await upsertSiteSettingSeed(
    'UPLOAD_ALLOWED_EXTENSIONS',
    JSON.stringify([
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.pdf',
      '.docx',
      '.xlsx',
    ]),
    '허용 파일 확장자',
  );
  await upsertSiteSettingSeed(
    'UPLOAD_ALLOWED_MIME_TYPES',
    JSON.stringify([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]),
    '허용 MIME 타입',
  );
  await upsertSiteSettingSeed(
    'UPLOAD_MAX_FILE_SIZE_MB',
    '10',
    '최대 파일 크기 (MB)',
  );
  console.log('✓ SiteSettings: 6 keys');

  // ─── 4. NavigationMenu x2 ──────────────────────────────
  const headerMenu = await upsertNavigationMenuSeed('Header Main', {
    description: '시연 헤더 메인 네비게이션',
    slots: ['HEADER'],
  });
  const footerMenu = await upsertNavigationMenuSeed('Footer', {
    description: '시연 푸터 네비게이션',
    slots: ['FOOTER'],
  });
  console.log(
    `✓ NavigationMenu: ${headerMenu.name} (HEADER), ${footerMenu.name} (FOOTER)`,
  );

  // ─── 5. Board x1: notice ───────────────────────────────
  const noticeBoard = await upsertBoardSeed('notice', {
    name: '공지사항',
    description: '시연용 공지사항 게시판',
    skinType: 'LIST',
    isPublic: true,
    displayOrder: 0,
  });
  console.log(`✓ Board: ${noticeBoard.slug} (${noticeBoard.name})`);

  // ─── 6. Subpage x1: about (PUBLISHED) ──────────────────
  const aboutSubpage = await upsertSubpageSeed('about', {
    title: '소개',
    content: '시연용 서브페이지입니다. 이 페이지는 매 방문자마다 격리됩니다.',
    status: 'PUBLISHED',
    publishedAt: new Date('2024-01-01T00:00:00Z'),
    displayOrder: 0,
    feedbackEnabled: false,
  });
  console.log(`✓ Subpage: ${aboutSubpage.slug} (${aboutSubpage.status})`);

  // ─── 7. PageBlock x1: about Subpage RICH_TEXT 본문 ─────
  const ABOUT_RICH_TEXT_DOC = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '시연용 서브페이지입니다. 이 페이지는 매 방문자마다 격리되어 자유롭게 편집할 수 있습니다.',
          },
        ],
      },
    ],
  };
  await upsertPageBlockSeed(aboutSubpage.id, 0, {
    blockType: 'RICH_TEXT',
    isVisible: true,
    configJson: { contentJson: ABOUT_RICH_TEXT_DOC },
  });
  console.log(`✓ PageBlock: about RICH_TEXT (displayOrder 0)`);

  // ─── 8. HomeSection x7 ─────────────────────────────────
  const homeSections = [
    {
      sectionType: 'HERO' as const,
      title: '메인 히어로',
      displayOrder: 0,
      configJson: { slides: [], slideOptions: DEFAULT_SLIDE_OPTIONS },
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
    await upsertHomeSectionSeed(section.sectionType, {
      title: section.title,
      displayOrder: section.displayOrder,
      configJson: section.configJson,
      isVisible: true,
    });
  }
  console.log('✓ HomeSection: 7 sections');

  // ─── 9. NavigationMenuItem x2: about 링크 (Header + Footer) ───
  await upsertNavigationMenuItemSeed(headerMenu.id, '소개', {
    itemType: 'SUBPAGE',
    subpageId: aboutSubpage.id,
    displayOrder: 0,
    isVisible: true,
  });
  await upsertNavigationMenuItemSeed(footerMenu.id, '소개', {
    itemType: 'SUBPAGE',
    subpageId: aboutSubpage.id,
    displayOrder: 0,
    isVisible: true,
  });
  console.log('✓ NavigationMenuItem: 2 (Header + Footer)');

  console.log('\nDemo seed completed successfully (sessionId=__SEED__).');
}

// ─── Helpers (findFirst → update | create — upsert 회피) ─────────────────────

async function upsertRoleSeed(
  name: string,
  data: {
    description: string;
    isSystem: boolean;
    isDefault: boolean;
    permissions: object;
  },
) {
  const existing = await prisma.role.findFirst({
    where: { sessionId: SEED_SENTINEL, name },
  });
  if (existing) {
    return prisma.role.update({
      where: { id: existing.id },
      data: {
        description: data.description,
        isSystem: data.isSystem,
        isDefault: data.isDefault,
        permissions: data.permissions,
      },
    });
  }
  return prisma.role.create({
    data: {
      name,
      sessionId: SEED_SENTINEL,
      description: data.description,
      isSystem: data.isSystem,
      isDefault: data.isDefault,
      permissions: data.permissions,
    },
  });
}

async function upsertUserSeed(input: {
  username: string;
  name: string;
  plainPassword: string;
  roleId: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { sessionId: SEED_SENTINEL, username: input.username },
  });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { name: input.name, status: 'ACTIVE', roleId: input.roleId },
    });
  }
  const hashedPassword = await hash(input.plainPassword, 10);
  return prisma.user.create({
    data: {
      sessionId: SEED_SENTINEL,
      username: input.username,
      password: hashedPassword,
      name: input.name,
      status: 'ACTIVE',
      roleId: input.roleId,
    },
  });
}

async function upsertSiteSettingSeed(
  key: string,
  value: string,
  description?: string,
) {
  const existing = await prisma.siteSettings.findFirst({
    where: { sessionId: SEED_SENTINEL, key },
  });
  if (existing) {
    return prisma.siteSettings.update({
      where: { id: existing.id },
      data: { value, description },
    });
  }
  return prisma.siteSettings.create({
    data: { sessionId: SEED_SENTINEL, key, value, description },
  });
}

async function upsertNavigationMenuSeed(
  name: string,
  data: {
    description: string;
    slots: ('HEADER' | 'FOOTER' | 'SIDEBAR')[];
  },
) {
  const existing = await prisma.navigationMenu.findFirst({
    where: { sessionId: SEED_SENTINEL, name },
  });
  if (existing) {
    return prisma.navigationMenu.update({
      where: { id: existing.id },
      data: { description: data.description, slots: data.slots },
    });
  }
  return prisma.navigationMenu.create({
    data: {
      sessionId: SEED_SENTINEL,
      name,
      description: data.description,
      slots: data.slots,
    },
  });
}

async function upsertBoardSeed(
  slug: string,
  data: {
    name: string;
    description: string;
    skinType: 'LIST' | 'GALLERY';
    isPublic: boolean;
    displayOrder: number;
  },
) {
  const existing = await prisma.board.findFirst({
    where: { sessionId: SEED_SENTINEL, slug },
  });
  if (existing) {
    return prisma.board.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.board.create({
    data: { sessionId: SEED_SENTINEL, slug, ...data },
  });
}

async function upsertSubpageSeed(
  slug: string,
  data: {
    title: string;
    content: string;
    status: 'DRAFT' | 'PUBLISHED';
    publishedAt: Date | null;
    displayOrder: number;
    feedbackEnabled: boolean;
  },
) {
  const existing = await prisma.subpage.findFirst({
    where: { sessionId: SEED_SENTINEL, slug },
  });
  if (existing) {
    return prisma.subpage.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.subpage.create({
    data: { sessionId: SEED_SENTINEL, slug, ...data },
  });
}

async function upsertPageBlockSeed(
  subpageId: string,
  displayOrder: number,
  data: {
    blockType: 'RICH_TEXT' | 'HTML' | 'IMAGE' | 'IFRAME';
    isVisible: boolean;
    configJson: object;
  },
) {
  const existing = await prisma.pageBlock.findFirst({
    where: { sessionId: SEED_SENTINEL, subpageId, displayOrder },
  });
  if (existing) {
    return prisma.pageBlock.update({
      where: { id: existing.id },
      data: {
        blockType: data.blockType,
        isVisible: data.isVisible,
        configJson: data.configJson,
      },
    });
  }
  return prisma.pageBlock.create({
    data: {
      sessionId: SEED_SENTINEL,
      subpageId,
      displayOrder,
      blockType: data.blockType,
      isVisible: data.isVisible,
      configJson: data.configJson,
    },
  });
}

async function upsertHomeSectionSeed(
  sectionType:
    | 'HERO'
    | 'RECOMMENDED'
    | 'SUB_CAROUSEL'
    | 'SHORTCUT'
    | 'LATEST_POSTS'
    | 'CTA'
    | 'NOTICE',
  data: {
    title: string;
    displayOrder: number;
    configJson: object;
    isVisible: boolean;
  },
) {
  const existing = await prisma.homeSection.findFirst({
    where: { sessionId: SEED_SENTINEL, sectionType },
  });
  if (existing) {
    // 운영 seed와 동일 — 기존 row가 있으면 덮어쓰지 않음 (운영자 수정본 보호)
    return existing;
  }
  return prisma.homeSection.create({
    data: { sessionId: SEED_SENTINEL, sectionType, ...data },
  });
}

async function upsertNavigationMenuItemSeed(
  menuId: string,
  label: string,
  data: {
    itemType: 'SUBPAGE' | 'BOARD' | 'EXTERNAL' | 'CUSTOM';
    subpageId?: string;
    boardId?: string;
    url?: string;
    displayOrder: number;
    isVisible: boolean;
  },
) {
  const existing = await prisma.navigationMenuItem.findFirst({
    where: { sessionId: SEED_SENTINEL, menuId, label, displayOrder: data.displayOrder },
  });
  if (existing) {
    return prisma.navigationMenuItem.update({
      where: { id: existing.id },
      data: {
        itemType: data.itemType,
        subpageId: data.subpageId ?? null,
        boardId: data.boardId ?? null,
        url: data.url ?? null,
        isVisible: data.isVisible,
      },
    });
  }
  return prisma.navigationMenuItem.create({
    data: {
      sessionId: SEED_SENTINEL,
      menuId,
      label,
      itemType: data.itemType,
      subpageId: data.subpageId,
      boardId: data.boardId,
      url: data.url,
      displayOrder: data.displayOrder,
      isVisible: data.isVisible,
    },
  });
}

main()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
