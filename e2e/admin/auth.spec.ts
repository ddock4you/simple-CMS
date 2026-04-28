import { test, expect, type BrowserContext, type APIRequestContext } from '@playwright/test';

const ADMIN_URL = 'http://localhost:3001';
const ADMIN_CREDS = { username: 'admin', password: 'changeme123' };

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

async function loginAsAdmin(request: APIRequestContext) {
  const res = await request.post(`${ADMIN_URL}/api/auth/login`, { data: ADMIN_CREDS });
  if (!res.ok()) throw new Error(`Admin login failed: ${res.status()}`);
}

async function registerTestUser(request: APIRequestContext, username: string) {
  const res = await request.post(`${ADMIN_URL}/api/auth/register`, {
    data: {
      username,
      password: 'testpass1',
      passwordConfirm: 'testpass1',
      name: `E2E ${username}`,
    },
  });
  if (!res.ok()) throw new Error(`Register failed: ${res.status()}`);
}

async function findPendingUserId(request: APIRequestContext, username: string): Promise<string> {
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

async function suspendUser(request: APIRequestContext, userId: string) {
  const res = await request.post(`${ADMIN_URL}/api/users/${userId}/suspend`);
  if (!res.ok()) throw new Error(`Suspend failed: ${res.status()}`);
}

async function setConcurrentLogin(request: APIRequestContext, enabled: boolean) {
  const res = await request.patch(`${ADMIN_URL}/api/settings/security`, {
    data: { concurrentLoginEnabled: enabled },
  });
  if (!res.ok()) throw new Error(`setConcurrentLogin failed: ${res.status()}`);
}

async function loginOnPage(
  page: import('@playwright/test').Page,
  username: string,
  password = 'testpass1',
) {
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
}

// ── 기존 테스트 ───────────────────────────────────────────────────────────────

test.describe('관리자 인증', () => {
  test('로그인 → 대시보드 이동', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await expect(page.getByRole('heading', { name: /로그인/ })).toBeVisible();

    await page.getByLabel('아이디').fill('admin');
    await page.getByLabel('비밀번호').fill('changeme123');
    await page.getByRole('button', { name: '로그인' }).click();

    await page.waitForURL(`${ADMIN_URL}/dashboard`);
    await expect(page.getByText('대시보드')).toBeVisible();
  });

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('아이디').fill('admin');
    await page.getByLabel('비밀번호').fill('wrong-password');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByText(/비밀번호|인증|오류/i)).toBeVisible();
    await expect(page).not.toHaveURL(`${ADMIN_URL}/dashboard`);
  });

  test('인증 없이 대시보드 접근 시 로그인 페이지로 리다이렉트', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard`);
    await page.waitForURL(`${ADMIN_URL}/login`);
    await expect(page.getByRole('heading', { name: /로그인/ })).toBeVisible();
  });
});

// ── 인증 분기 시나리오 ─────────────────────────────────────────────────────────

test.describe('인증 분기 시나리오', () => {
  // CONCURRENT_LOGIN_ENABLED 변경 후 복원 보장 (belt-and-suspenders)
  test.afterEach(async ({ request }) => {
    try {
      await setConcurrentLogin(request, true);
    } catch {
      // 설정 변경이 없었거나 admin 인증이 없는 경우 — 무시
    }
  });

  test('PENDING 사용자 로그인 시도 → 승인 대기 메시지 표시', async ({ request, page }) => {
    const username = `e2e_pend_${Date.now()}`;

    await loginAsAdmin(request);
    await registerTestUser(request, username);

    await loginOnPage(page, username);

    await expect(page.getByText(/승인 대기/)).toBeVisible();
    await expect(page).not.toHaveURL(`${ADMIN_URL}/dashboard`);
  });

  test('SUSPENDED 사용자 로그인 시도 → 계정 정지 메시지 표시', async ({ request, page }) => {
    const username = `e2e_susp_${Date.now()}`;

    await loginAsAdmin(request);
    await registerTestUser(request, username);
    const userId = await findPendingUserId(request, username);
    await approveUser(request, userId);
    await suspendUser(request, userId);

    await loginOnPage(page, username);

    await expect(page.getByText(/정지/)).toBeVisible();
    await expect(page).not.toHaveURL(`${ADMIN_URL}/dashboard`);
  });

  test('SUSPENDED 처리 시 기존 세션 즉시 무효화 → /login 리다이렉트', async ({
    request,
    browser,
  }) => {
    const username = `e2e_sess_${Date.now()}`;
    let userContext: BrowserContext | null = null;

    await loginAsAdmin(request);
    await registerTestUser(request, username);
    const userId = await findPendingUserId(request, username);
    await approveUser(request, userId);

    try {
      userContext = await browser.newContext();
      const userPage = await userContext.newPage();

      await loginOnPage(userPage, username);
      await userPage.waitForURL(`${ADMIN_URL}/dashboard`);

      // 관리자가 사용자를 정지 → 세션 즉시 삭제됨
      await suspendUser(request, userId);

      // 기존 세션으로 대시보드 접근 시 로그인으로 리다이렉트
      await userPage.goto(`${ADMIN_URL}/dashboard`);
      await userPage.waitForURL(`${ADMIN_URL}/login`);
    } finally {
      await userContext?.close();
    }
  });

  test('CONCURRENT_LOGIN=false: 새 로그인이 기존 세션을 무효화', async ({
    request,
    browser,
  }) => {
    const username = `e2e_conc_f_${Date.now()}`;
    let contextA: BrowserContext | null = null;
    let contextB: BrowserContext | null = null;

    await loginAsAdmin(request);
    await registerTestUser(request, username);
    const userId = await findPendingUserId(request, username);
    await approveUser(request, userId);

    try {
      await setConcurrentLogin(request, false);

      // 세션 A 생성
      contextA = await browser.newContext();
      const pageA = await contextA.newPage();
      await loginOnPage(pageA, username);
      await pageA.waitForURL(`${ADMIN_URL}/dashboard`);

      // 세션 B 생성 → 세션 A 무효화됨
      contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      await loginOnPage(pageB, username);
      await pageB.waitForURL(`${ADMIN_URL}/dashboard`);

      // 세션 A로 접근하면 로그인으로 리다이렉트
      await pageA.goto(`${ADMIN_URL}/dashboard`);
      await pageA.waitForURL(`${ADMIN_URL}/login`);

      // 세션 B는 정상 유지
      await pageB.goto(`${ADMIN_URL}/dashboard`);
      await expect(pageB).toHaveURL(`${ADMIN_URL}/dashboard`);
    } finally {
      await contextA?.close();
      await contextB?.close();
      await setConcurrentLogin(request, true);
    }
  });

  test('CONCURRENT_LOGIN=true: 다중 세션 동시 유지', async ({ request, browser }) => {
    const username = `e2e_conc_t_${Date.now()}`;
    let contextA: BrowserContext | null = null;
    let contextB: BrowserContext | null = null;

    await loginAsAdmin(request);
    await registerTestUser(request, username);
    const userId = await findPendingUserId(request, username);
    await approveUser(request, userId);

    try {
      await setConcurrentLogin(request, true);

      contextA = await browser.newContext();
      const pageA = await contextA.newPage();
      await loginOnPage(pageA, username);
      await pageA.waitForURL(`${ADMIN_URL}/dashboard`);

      contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      await loginOnPage(pageB, username);
      await pageB.waitForURL(`${ADMIN_URL}/dashboard`);

      // 두 세션 모두 유효
      await pageA.goto(`${ADMIN_URL}/dashboard`);
      await expect(pageA).toHaveURL(`${ADMIN_URL}/dashboard`);

      await pageB.goto(`${ADMIN_URL}/dashboard`);
      await expect(pageB).toHaveURL(`${ADMIN_URL}/dashboard`);
    } finally {
      await contextA?.close();
      await contextB?.close();
    }
  });
});
