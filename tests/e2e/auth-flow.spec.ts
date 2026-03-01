import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts } from '../fixtures/helpers';

const TEST_EMAIL = 'admin@test.com';
const TEST_PASSWORD = 'Admin123!';

test.describe('Authentication - Login without 2FA', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Login page loads correctly without 2FA field', async ({ page }) => {
    await page.goto('/auth');
    await waitForAppReady(page);
    
    // Verify login form elements are visible
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('auth-submit-btn')).toBeVisible();
    
    // Verify NO 2FA code field is shown on initial login form
    const twoFactorInput = page.locator('[data-testid="two-factor-input"], input[placeholder*="2FA"], input[placeholder*="authenticator"], input[placeholder*="verification code"]');
    await expect(twoFactorInput).not.toBeVisible();
  });

  test('Can login with valid credentials without 2FA and see dashboard', async ({ page }) => {
    await page.goto('/auth');
    await waitForAppReady(page);
    
    // Fill login form
    await page.getByTestId('email-input').fill(TEST_EMAIL);
    await page.getByTestId('password-input').fill(TEST_PASSWORD);
    
    // Submit login
    await page.getByTestId('auth-submit-btn').click();
    
    // Wait for redirect to dashboard or training
    await expect(page).toHaveURL(/\/(dashboard|training)/, { timeout: 30000 });
    
    // Verify we're on the dashboard page
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
  });

  test('Login form shows forgot password link', async ({ page }) => {
    await page.goto('/auth');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('forgot-password-btn')).toBeVisible();
  });

  test('Can toggle to inquiry form', async ({ page }) => {
    await page.goto('/auth');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('toggle-auth-btn')).toBeVisible();
    await page.getByTestId('toggle-auth-btn').click();
    
    // Verify inquiry form fields appear
    await expect(page.getByTestId('inquiry-email-input')).toBeVisible();
    await expect(page.getByTestId('inquiry-phone-input')).toBeVisible();
    await expect(page.getByTestId('inquiry-message-input')).toBeVisible();
  });
});
