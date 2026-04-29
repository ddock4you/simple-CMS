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

    await page.getByRole('button', { name: '저장' }).click();

    // 생성 후 상세 페이지로 이동 — URL에서 id 추출
    await page.waitForURL(/\/subpages\/[a-z0-9]+$/);
    const url = page.url();
    subpageId = url.split('/').pop() ?? '';
    expect(subpageId).toBeTruthy();
    await expect(page.getByText('초안', { exact: true })).toBeVisible();
  });

  test('3. 서브페이지 발행', async ({ page }) => {
    if (!subpageId) test.skip();

    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('아이디').fill(ADMIN_USERNAME);
    await page.getByLabel('비밀번호').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL(`${ADMIN_URL}/dashboard`);

    await page.goto(`${ADMIN_URL}/subpages/${subpageId}/edit`);
    // 상태를 '발행'으로 변경
    const statusSelect = page.getByRole('combobox').filter({ hasText: /초안|발행/ });
    await statusSelect.click();
    await page.getByRole('option', { name: '발행' }).click();

    await page.getByRole('button', { name: '저장' }).click();
    await page.waitForURL(`${ADMIN_URL}/subpages/${subpageId}`);
    await expect(page.getByText('발행', { exact: true })).toBeVisible();
  });

  test('4. web에서 공개 서브페이지 확인', async ({ page }) => {
    await page.goto(`${WEB_URL}/p/${SLUG}`);
    await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  });

  test('5. 검색에서 서브페이지 노출', async ({ page }) => {
    const keyword = TITLE.split(' ')[0]; // "E2E" 키워드로 검색
    await page.goto(`${WEB_URL}/search?q=${encodeURIComponent(keyword)}`);
    await expect(page.getByText(TITLE)).toBeVisible({ timeout: 10_000 });
  });
});
