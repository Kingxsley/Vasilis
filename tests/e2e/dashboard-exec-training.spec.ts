import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts } from '../fixtures/helpers';

const TEST_EMAIL = 'admin@test.com';
const TEST_PASSWORD = 'Admin123!';

// Serial execution - login once and reuse for all tests
test.describe.configure({ mode: 'serial' });

test.describe('Dashboard and Executive Training', () => {
  test.beforeAll(async ({ browser }) => {
    // Login once and save storage state
    const context = await browser.newContext();
    const page = await context.newPage();
    await dismissToasts(page);
    
    await page.goto('https://vasilis-cert-fix.preview.emergentagent.com/auth');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('email-input').fill(TEST_EMAIL);
    await page.getByTestId('password-input').fill(TEST_PASSWORD);
    await page.getByTestId('auth-submit-btn').click();
    
    // Wait for successful navigation
    await page.waitForURL(/\/(dashboard|training)/, { timeout: 30000 });
    
    // Save storage state
    await context.storageState({ path: '/tmp/auth-state.json' });
    await context.close();
  });

  test.use({ storageState: '/tmp/auth-state.json' });

  test('Dashboard shows Online Now stat card', async ({ page }) => {
    await dismissToasts(page);
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
    await dismissToasts(page);
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
    await dismissToasts(page);
    await page.goto('/executive-training');
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible({ timeout: 10000 });
    
    // Check for pre-built modules section
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 10000 });
    
    // Verify modules are displayed by checking for slide count badges
    await expect(page.locator('text=/\\d+ Slides/').first()).toBeVisible({ timeout: 10000 });
  });

  test('Can download PowerPoint presentation', async ({ page }) => {
    await dismissToasts(page);
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
    await dismissToasts(page);
    await page.goto('/executive-training');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for the modules section text
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 10000 });
    
    // Check for slide count badges
    const slideBadges = page.locator('text=/\\d+ Slides/');
    await expect(slideBadges.first()).toBeVisible();
  });
});
