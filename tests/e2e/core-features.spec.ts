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
    await expect(page).toHaveURL(/\/(dashboard|training)/, { timeout: 15000 });
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
    // Login directly via page navigation with credentials in URL not possible
    // Use direct login approach
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('email-input').fill(TEST_EMAIL);
    await page.getByTestId('password-input').fill(TEST_PASSWORD);
    await page.getByTestId('auth-submit-btn').click();
    await page.waitForURL(/\/(dashboard|training)/, { timeout: 15000 });
  });

  test('Dashboard shows Online Now stat card', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Look for the Online Now stat card
    const onlineNowCard = page.getByTestId('stat-online-now');
    await expect(onlineNowCard).toBeVisible();
    
    // Verify it shows a number
    const onlineCount = onlineNowCard.locator('p.text-3xl');
    await expect(onlineCount).toBeVisible();
  });

  test('Dashboard displays all stat cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
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
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('email-input').fill(TEST_EMAIL);
    await page.getByTestId('password-input').fill(TEST_PASSWORD);
    await page.getByTestId('auth-submit-btn').click();
    await page.waitForURL(/\/(dashboard|training)/, { timeout: 15000 });
  });

  test('Executive Training page loads with modules', async ({ page }) => {
    await page.goto('/executive-training');
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible();
    
    // Check for pre-built modules section
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 10000 });
    
    // Verify modules are displayed by checking for slide count badges
    await expect(page.locator('text=/\\d+ Slides/').first()).toBeVisible({ timeout: 10000 });
  });

  test('Can download PowerPoint presentation', async ({ page }) => {
    await page.goto('/executive-training');
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible();
    
    // Wait for modules text to appear (indicates loading complete)
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 10000 });
    
    // Find first Download PPTX button
    const downloadButton = page.getByRole('button', { name: /Download PPTX/i }).first();
    await expect(downloadButton).toBeVisible({ timeout: 5000 });
    
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
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for the modules section text
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 10000 });
    
    // Check for slide count badges
    const slideBadges = page.locator('text=/\\d+ Slides/');
    await expect(slideBadges.first()).toBeVisible();
  });
});
