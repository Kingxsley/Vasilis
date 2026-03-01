import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts } from '../fixtures/helpers';

const TEST_EMAIL = 'admin@test.com';
const TEST_PASSWORD = 'Admin123!';

test.describe('Dashboard and Executive Training', () => {
  // Login and persist state in the first test
  let isLoggedIn = false;

  async function ensureLoggedIn(page: any) {
    if (isLoggedIn) {
      return;
    }
    
    // Check if already authenticated by trying to access dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    
    // If redirected to auth page, login
    if (page.url().includes('/auth')) {
      await page.goto('/auth');
      await page.waitForLoadState('domcontentloaded');
      await page.getByTestId('email-input').fill(TEST_EMAIL);
      await page.getByTestId('password-input').fill(TEST_PASSWORD);
      await page.getByTestId('auth-submit-btn').click();
      await page.waitForURL(/\/(dashboard|training)/, { timeout: 30000 });
    }
    
    isLoggedIn = true;
  }

  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await ensureLoggedIn(page);
  });

  test('Dashboard shows Online Now stat card', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
    
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
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
    
    // Check multiple stat cards are visible
    await expect(page.getByTestId('stat-organizations')).toBeVisible();
    await expect(page.getByTestId('stat-total-users')).toBeVisible();
    await expect(page.getByTestId('stat-online-now')).toBeVisible();
    await expect(page.getByTestId('stat-campaigns')).toBeVisible();
  });

  test('Executive Training page loads with modules', async ({ page }) => {
    await page.goto('/executive-training');
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible({ timeout: 10000 });
    
    // Check for pre-built modules section
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 10000 });
    
    // Verify modules are displayed by checking for slide count badges
    await expect(page.locator('text=/\\d+ Slides/').first()).toBeVisible({ timeout: 10000 });
  });

  test('Can download PowerPoint presentation', async ({ page }) => {
    await page.goto('/executive-training');
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible({ timeout: 10000 });
    
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
