import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, loginAsAdmin } from '../fixtures/helpers';

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
    
    await page.screenshot({ path: '.screenshots/01_login_page_no_2fa.png', quality: 20 });
  });

  test('Can login with valid credentials without 2FA', async ({ page }) => {
    await page.goto('/auth');
    await waitForAppReady(page);
    
    // Fill login form
    await page.getByTestId('email-input').fill(TEST_EMAIL);
    await page.getByTestId('password-input').fill(TEST_PASSWORD);
    
    // Submit login
    await page.getByTestId('auth-submit-btn').click();
    
    // Wait for redirect to dashboard or training
    await expect(page).toHaveURL(/\/(dashboard|training)/, { timeout: 10000 });
    
    await page.screenshot({ path: '.screenshots/02_logged_in.png', quality: 20 });
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

test.describe('Dashboard - Online Users Display', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test('Dashboard shows Online Now stat card', async ({ page }) => {
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Look for the Online Now stat card
    const onlineNowCard = page.getByTestId('stat-online-now');
    await expect(onlineNowCard).toBeVisible();
    
    // Verify it shows a number
    const onlineCount = onlineNowCard.locator('p.text-3xl');
    await expect(onlineCount).toBeVisible();
    
    await page.screenshot({ path: '.screenshots/03_dashboard_online_users.png', quality: 20 });
  });

  test('Dashboard displays all stat cards', async ({ page }) => {
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Check multiple stat cards are visible
    await expect(page.getByTestId('stat-organizations')).toBeVisible();
    await expect(page.getByTestId('stat-total-users')).toBeVisible();
    await expect(page.getByTestId('stat-online-now')).toBeVisible();
    await expect(page.getByTestId('stat-campaigns')).toBeVisible();
  });
});

test.describe('Executive Training Page', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test('Executive Training page loads with modules', async ({ page }) => {
    await page.goto('/executive-training');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible();
    
    // Wait for modules to load (loader should disappear)
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 });
    
    // Check for pre-built modules section
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible();
    
    await page.screenshot({ path: '.screenshots/04_executive_training.png', quality: 20 });
  });

  test('Can download PowerPoint presentation', async ({ page }) => {
    await page.goto('/executive-training');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible();
    
    // Wait for modules to load
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 });
    
    // Find first Download PPTX button
    const downloadButton = page.getByRole('button', { name: /Download PPTX/i }).first();
    await expect(downloadButton).toBeVisible();
    
    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Click download
    await downloadButton.click();
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify the filename ends with .pptx
    expect(download.suggestedFilename()).toMatch(/\.pptx$/);
  });

  test('Module cards show slide count badges', async ({ page }) => {
    await page.goto('/executive-training');
    await waitForAppReady(page);
    
    // Wait for modules to load
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 });
    
    // Check for slide count badges
    const slideBadges = page.locator('text=/\\d+ Slides/');
    await expect(slideBadges.first()).toBeVisible();
  });
});
