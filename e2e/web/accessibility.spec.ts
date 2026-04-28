import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WEB_URL = 'http://localhost:3000';

test.describe('공개 웹 접근성 (axe-core WCAG AA)', () => {
  test('메인 페이지 axe 검사', async ({ page }) => {
    await page.goto(WEB_URL);
    await expect(page.locator('header')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('검색 페이지 axe 검사', async ({ page }) => {
    await page.goto(`${WEB_URL}/search?q=테스트`);
    await expect(page.locator('main')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
