/**
 * Stage 12j — RBAC 매트릭스 E2E
 *
 * Owner(총괄 관리자) / Editor(일반 관리자) / Viewer(읽기 전용) 3개 역할 ×
 * 대표 5개 리소스(subpages / posts / media / users / settings) 에 대해
 * 사이드바 메뉴 노출 여부와 API 접근 허가·차단을 검증한다.
 *
 * 사전 조건: admin(3001) + PostgreSQL 실행 중 / pnpm seed 완료.
 *
 * 매트릭스 요약:
 *                    | subpages | posts | media | users | settings
 * Owner  (isSystem)  |    ✅    |  ✅   |  ✅   |  ✅   |   ✅
 * Editor (default)   |    ✅    |  ✅   |  ✅   |  ❌   |   ❌
 * Viewer (read-only) |    ✅    |  ❌   |  ❌   |  ❌   |   ❌
 */
import {
  test,
  expect,
  type BrowserContext,
  type APIRequestContext,
} from '@playwright/test';

const ADMIN_URL = 'http://localhost:3001';
const ADMIN_CREDS = {
  username:
    process.env.E2E_ADMIN_USERNAME ??
    process.env.INITIAL_ADMIN_USERNAME ??
    'admin',
  password:
    process.env.E2E_ADMIN_PASSWORD ??
    process.env.INITIAL_ADMIN_PASSWORD ??
    'tmdgus123!',
};
const TEST_PASSWORD = 'testpass1';

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function adminLogin(request: APIRequestContext) {
  const res = await request.post(`${ADMIN_URL}/api/auth/login`, {
    data: ADMIN_CREDS,
  });
  if (!res.ok()) throw new Error(`Admin login failed: ${res.status()}`);
}

async function registerTestUser(request: APIRequestContext, username: string) {
  const res = await request.post(`${ADMIN_URL}/api/auth/register`, {
    data: {
      username,
      password: TEST_PASSWORD,
      passwordConfirm: TEST_PASSWORD,
      name: `E2E ${username}`,
    },
  });
  if (!res.ok()) throw new Error(`Register failed: ${res.status()}`);
}

async function findPendingUserId(
  request: APIRequestContext,
  username: string,
): Promise<string> {
  const res = await request.get(`${ADMIN_URL}/api/users?status=PENDING`);
  const body = await res.json();
  const user = (body.data?.items ?? []).find(
    (u: { username: string; id: string }) => u.username === username,
  );
  if (!user) throw new Error(`PENDING user '${username}' not found`);
  return user.id;
}

async function approveUser(request: APIRequestContext, userId: string) {
  const res = await request.post(`${ADMIN_URL}/api/users/${userId}/approve`);
  if (!res.ok()) throw new Error(`Approve failed: ${res.status()}`);
}

async function loginInContext(
  context: BrowserContext,
  username: string,
  password = TEST_PASSWORD,
) {
  const page = await context.newPage();
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL(`${ADMIN_URL}/dashboard`);
  await page.close();
}

// ── 테스트 ────────────────────────────────────────────────────────────────────

test.describe('RBAC 매트릭스 — 역할별 사이드바 노출·API 접근 검증', () => {
  const suffix = String(Date.now()).slice(-8);
  const editorUsername = `e2e_editor_${suffix}`;
  const viewerUsername = `e2e_viewer_${suffix}`;

  let editorUserId = '';
  let viewerUserId = '';
  let viewerRoleId = '';

  let ownerContext: BrowserContext | null = null;
  let editorContext: BrowserContext | null = null;
  let viewerContext: BrowserContext | null = null;

  test.beforeAll(async ({ request, browser }) => {
    // 1. Admin login
    await adminLogin(request);

    // 2. "읽기 전용" 역할 생성 (subpages:read 만)
    const roleRes = await request.post(`${ADMIN_URL}/api/roles`, {
      data: {
        name: `읽기 전용 E2E ${suffix}`,
        description: 'E2E 테스트용 읽기 전용 역할',
        permissions: { subpages: { read: true } },
      },
    });
    if (!roleRes.ok())
      throw new Error(`Create viewer role failed: ${roleRes.status()}`);
    viewerRoleId = (await roleRes.json()).data.id;

    // 3. 테스트 사용자 생성 + 승인 (기본 역할 배정)
    await registerTestUser(request, editorUsername);
    await registerTestUser(request, viewerUsername);

    editorUserId = await findPendingUserId(request, editorUsername);
    viewerUserId = await findPendingUserId(request, viewerUsername);

    await approveUser(request, editorUserId);
    await approveUser(request, viewerUserId);

    // 4. viewerUser에 "읽기 전용" 역할 배정
    const assignRes = await request.patch(
      `${ADMIN_URL}/api/users/${viewerUserId}/role`,
      { data: { roleId: viewerRoleId } },
    );
    if (!assignRes.ok())
      throw new Error(`Assign viewer role failed: ${assignRes.status()}`);

    // 5. 역할별 브라우저 컨텍스트 생성 + 로그인
    ownerContext = await browser.newContext();
    editorContext = await browser.newContext();
    viewerContext = await browser.newContext();

    await loginInContext(ownerContext, ADMIN_CREDS.username, ADMIN_CREDS.password);
    await loginInContext(editorContext, editorUsername);
    await loginInContext(viewerContext, viewerUsername);
  });

  test.afterAll(async ({ request }) => {
    await ownerContext?.close();
    await editorContext?.close();
    await viewerContext?.close();

    // 역할 삭제 전 viewerUser를 기본 역할로 돌려놓음
    try {
      await adminLogin(request);
      // default role 조회
      const rolesRes = await request.get(`${ADMIN_URL}/api/roles`);
      const defaultRole = (await rolesRes.json()).data?.roles?.find(
        (r: { isDefault: boolean; id: string }) => r.isDefault,
      );
      if (defaultRole && viewerUserId) {
        await request.patch(`${ADMIN_URL}/api/users/${viewerUserId}/role`, {
          data: { roleId: defaultRole.id },
        });
      }
      if (viewerRoleId) {
        await request.delete(`${ADMIN_URL}/api/roles/${viewerRoleId}`);
      }
    } catch {
      // 정리 실패는 테스트 결과에 영향 없음
    }
  });

  // ── 사이드바 메뉴 노출 ────────────────────────────────────────────────────────

  test('Owner(총괄 관리자) — 모든 대표 메뉴 노출', async () => {
    const page = await ownerContext!.newPage();
    await page.goto(`${ADMIN_URL}/dashboard`);

    await expect(page.getByRole('link', { name: '서브 페이지' })).toBeVisible();
    await expect(page.getByRole('link', { name: '게시글' })).toBeVisible();
    await expect(page.getByRole('link', { name: '미디어' })).toBeVisible();
    await expect(page.getByRole('link', { name: '사용자 관리' })).toBeVisible();
    await expect(page.getByRole('link', { name: '사이트 설정' })).toBeVisible();

    await page.close();
  });

  test('Editor(일반 관리자) — 콘텐츠 메뉴 노출, 사용자·설정 숨김', async () => {
    const page = await editorContext!.newPage();
    await page.goto(`${ADMIN_URL}/dashboard`);

    await expect(page.getByRole('link', { name: '서브 페이지' })).toBeVisible();
    await expect(page.getByRole('link', { name: '게시글' })).toBeVisible();
    await expect(page.getByRole('link', { name: '미디어' })).toBeVisible();
    // users:read, settings:read 없음 → 숨김
    await expect(page.getByRole('link', { name: '사용자 관리' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: '사이트 설정' })).not.toBeVisible();

    await page.close();
  });

  test('Viewer(읽기 전용) — 서브 페이지만 노출, 나머지 숨김', async () => {
    const page = await viewerContext!.newPage();
    await page.goto(`${ADMIN_URL}/dashboard`);

    await expect(page.getByRole('link', { name: '서브 페이지' })).toBeVisible();
    // posts:read, media:read, users:read, settings:read 없음 → 숨김
    await expect(page.getByRole('link', { name: '게시글' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: '미디어' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: '사용자 관리' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: '사이트 설정' })).not.toBeVisible();

    await page.close();
  });

  // ── API 접근 제어 ──────────────────────────────────────────────────────────────

  test('Editor(일반 관리자) — 허가 리소스 200, 미허가 리소스 403', async () => {
    // 허가: subpages:read, posts:read, media:read
    expect((await editorContext!.request.get(`${ADMIN_URL}/api/subpages`)).status()).toBe(200);
    expect((await editorContext!.request.get(`${ADMIN_URL}/api/posts`)).status()).toBe(200);
    expect((await editorContext!.request.get(`${ADMIN_URL}/api/media`)).status()).toBe(200);

    // 미허가: users:read, settings:read
    expect((await editorContext!.request.get(`${ADMIN_URL}/api/users`)).status()).toBe(403);
    expect(
      (await editorContext!.request.get(`${ADMIN_URL}/api/settings/domain`)).status(),
    ).toBe(403);
  });

  test('Viewer(읽기 전용) — 허가 리소스(subpages) 200, 미허가 4종 403', async () => {
    // 허가: subpages:read
    expect(
      (await viewerContext!.request.get(`${ADMIN_URL}/api/subpages`)).status(),
    ).toBe(200);

    // 미허가: posts:read, media:read, users:read, settings:read
    expect((await viewerContext!.request.get(`${ADMIN_URL}/api/posts`)).status()).toBe(403);
    expect((await viewerContext!.request.get(`${ADMIN_URL}/api/media`)).status()).toBe(403);
    expect((await viewerContext!.request.get(`${ADMIN_URL}/api/users`)).status()).toBe(403);
    expect(
      (await viewerContext!.request.get(`${ADMIN_URL}/api/settings/domain`)).status(),
    ).toBe(403);
  });
});
