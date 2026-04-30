/**
 * 골든 플로우 E2E:
 * admin 로그인 → 서브페이지 생성 → 발행 → web 공개 확인 → 검색 → 피드백 제출
 *
 * 전제: admin(3001) + web(3000) dev 서버 실행 중
 * CI 통합: Stage 8 (Docker + CI/CD)에서 서버 자동 기동과 함께 추가 예정
 */
import { test, expect } from '@playwright/test';

const ADMIN_URL = 'http://localhost:3001';
const WEB_URL = 'http://localhost:3000';
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'changeme123';

const SLUG = `e2e-test-${Date.now()}`;
const TITLE = `E2E 테스트 페이지 ${Date.now()}`;

test.describe('골든 플로우', () => {
  let subpageId: string;

  test.afterAll(async ({ browser }) => {
    // 테스트 후 생성된 서브페이지 삭제 (데이터 정리)
    if (!subpageId) return;
    const ctx = await browser.newContext({ baseURL: ADMIN_URL });
    const page = await ctx.newPage();
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('아이디').fill(ADMIN_USERNAME);
    await page.getByLabel('비밀번호').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL(`${ADMIN_URL}/dashboard`);

    const res = await page.request.delete(`${ADMIN_URL}/api/subpages/${subpageId}`);
    await ctx.close();
    if (!res.ok()) {
      console.warn(`[E2E cleanup] subpage ${subpageId} 삭제 실패: ${res.status()}`);
    }
  });

  test('1. admin 로그인', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('아이디').fill(ADMIN_USERNAME);
    await page.getByLabel('비밀번호').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL(`${ADMIN_URL}/dashboard`);
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
  });

  test('2. 서브페이지 생성 (초안)', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('아이디').fill(ADMIN_USERNAME);
    await page.getByLabel('비밀번호').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL(`${ADMIN_URL}/dashboard`);

    await page.goto(`${ADMIN_URL}/subpages/new`);
    await page.getByLabel('제목', { exact: true }).fill(TITLE);

    // slug 자동 생성 대기
    await page.waitForTimeout(300);

    // slug 필드를 고정값으로 교체
    const slugField = page.getByLabel('Slug');
    await slugField.fill('');
    await slugField.fill(SLUG);

    // 클릭과 동시에 navigation 대기 — race condition 방지
    // 정규식 `/subpages/[a-z0-9]+$/`은 `/subpages/new`도 매칭하므로 'new' 명시적 제외
    await Promise.all([
      page.waitForURL(
        (url) =>
          /^\/subpages\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/new'),
      ),
      page.getByRole('button', { name: '저장' }).click(),
    ]);

    const url = page.url();
    subpageId = url.split('/').pop() ?? '';
    expect(subpageId).toBeTruthy();
    expect(subpageId).not.toBe('new');
    // SubpageView는 헤더와 메타 카드 두 곳에서 SubpageStatusBadge를 렌더 → 첫 번째만 검증
    await expect(page.getByText('초안', { exact: true }).first()).toBeVisible();
  });

  test('3. 서브페이지 발행', async ({ page }) => {
    if (!subpageId) test.skip();

    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('아이디').fill(ADMIN_USERNAME);
    await page.getByLabel('비밀번호').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL(`${ADMIN_URL}/dashboard`);

    // page.request 대신 page.evaluate(fetch) — 브라우저 컨텍스트 안에서 실행하여
    // httpOnly 세션 쿠키가 자동 포함됨 (page.request는 쿠키 전달이 불안정한 케이스 있음)
    const { ok, status, body } = await page.evaluate(async (id: string) => {
      const res = await fetch(`/api/subpages/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
    }, subpageId);

    expect(status, `PATCH 실패 [HTTP ${status}]: ${JSON.stringify(body)}`).toBe(200);
    expect(ok).toBeTruthy();
    expect(body?.success).toBe(true);
  });

  test('4. web에서 공개 서브페이지 확인', async ({ page }) => {
    await page.goto(`${WEB_URL}/p/${SLUG}`);
    // 좌측 SubpageSideNavigation의 <h2 class="lnb-tit">와 메인 <h1 class="subpage-title">가
    // 같은 TITLE을 표시하므로 level: 1로 메인 제목만 매칭
    await expect(
      page.getByRole('heading', { level: 1, name: TITLE }),
    ).toBeVisible();
  });

  test('5. 검색에서 서브페이지 노출', async ({ page }) => {
    const keyword = TITLE.split(' ')[0]; // "E2E" 키워드로 검색
    await page.goto(`${WEB_URL}/search?q=${encodeURIComponent(keyword)}`);
    // 검색 결과 페이지에 TITLE이 여러 곳(목록 카드 헤더 등)에 노출될 수 있어 first()로 안전하게 검증
    await expect(page.getByText(TITLE).first()).toBeVisible({ timeout: 10_000 });
  });
});
