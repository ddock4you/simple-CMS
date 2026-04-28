import { test as base, type Page } from '@playwright/test';

const ADMIN_URL = 'http://localhost:3001';
const WEB_URL = 'http://localhost:3000';
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'changeme123';

export { ADMIN_URL, WEB_URL };

export async function loginAdmin(page: Page) {
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel('아이디').fill(ADMIN_USERNAME);
  await page.getByLabel('비밀번호').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL(`${ADMIN_URL}/dashboard`);
}

export const test = base.extend<{ adminPage: Page; webPage: Page }>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ baseURL: ADMIN_URL });
    const page = await ctx.newPage();
    await loginAdmin(page);
    await use(page);
    await ctx.close();
  },
  webPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ baseURL: WEB_URL });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
