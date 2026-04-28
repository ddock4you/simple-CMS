import { test, expect } from '@playwright/test';

const WEB_URL = 'http://localhost:3000';

test.describe('공개 웹 기본 탐색', () => {
  test('메인 페이지 로드', async ({ page }) => {
    await page.goto(WEB_URL);
    await expect(page).toHaveTitle(/.+/);
    // 헤더가 렌더되는지 확인 (KRDS Header)
    await expect(page.locator('header')).toBeVisible();
  });

  test('존재하지 않는 페이지 → 404', async ({ page }) => {
    const res = await page.goto(`${WEB_URL}/p/this-page-does-not-exist-e2e`);
    expect(res?.status()).toBe(404);
  });

  test('검색 페이지 기본 렌더', async ({ page }) => {
    await page.goto(`${WEB_URL}/search?q=테스트`);
    // 검색 결과 컨테이너가 렌더되는지 확인
    await expect(page.locator('main')).toBeVisible();
  });
});
