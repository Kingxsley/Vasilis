import { Page, expect } from '@playwright/test';

export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
}

export async function dismissToasts(page: Page) {
  await page.addLocatorHandler(
    page.locator('[data-sonner-toast], .Toastify__toast, [role="status"].toast, .MuiSnackbar-root'),
    async () => {
      const close = page.locator('[data-sonner-toast] [data-close], [data-sonner-toast] button[aria-label="Close"], .Toastify__close-button, .MuiSnackbar-root button');
      await close.first().click({ timeout: 2000 }).catch(() => {});
    },
    { times: 10, noWaitAfter: true }
  );
}

export async function checkForErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const errorElements = Array.from(
      document.querySelectorAll('.error, [class*="error"], [id*="error"]')
    );
    return errorElements.map(el => el.textContent || '').filter(Boolean);
  });
}

// Updated admin credentials
export const ADMIN_EMAIL = 'test@admin.com';
export const ADMIN_PASSWORD = 'TestAdmin123!';

// Viewer credentials
export const VIEWER_EMAIL = 'admin@test.com';
export const VIEWER_PASSWORD = 'Admin123!';

export async function loginAsAdmin(page: Page, email?: string, password?: string) {
  await page.goto('/auth');
  await page.waitForLoadState('domcontentloaded');
  await page.getByTestId('email-input').fill(email || ADMIN_EMAIL);
  await page.getByTestId('password-input').fill(password || ADMIN_PASSWORD);
  await page.getByTestId('auth-submit-btn').click();
  // Wait for navigation to dashboard or training page with longer timeout for rate limiting
  await page.waitForURL(/\/(dashboard|training)/, { timeout: 45000 });
}

export async function loginAsViewer(page: Page) {
  return loginAsAdmin(page, VIEWER_EMAIL, VIEWER_PASSWORD);
}
