import { test, expect } from '@playwright/test';

const ADMIN_URL = 'http://localhost:3001';

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
