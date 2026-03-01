import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts } from '../fixtures/helpers';

const TEST_EMAIL = 'admin@test.com';
const TEST_PASSWORD = 'Admin123!';

/**
 * Single comprehensive test that:
 * 1. Logs in once
 * 2. Verifies dashboard "Online Now" stat
 * 3. Navigates to Executive Training
 * 4. Downloads a presentation
 */
test.describe('Dashboard and Executive Training Features', () => {
  test('Complete flow: Login -> Dashboard -> Executive Training', async ({ page }) => {
    await dismissToasts(page);
    
    // Step 1: Login
    await page.goto('/auth');
    await waitForAppReady(page);
    
    await page.getByTestId('email-input').fill(TEST_EMAIL);
    await page.getByTestId('password-input').fill(TEST_PASSWORD);
    await page.getByTestId('auth-submit-btn').click();
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard|training)/, { timeout: 30000 });
    
    // Step 2: Verify Dashboard with Online Now stat
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
    
    // Verify Online Now stat card
    const onlineNowCard = page.getByTestId('stat-online-now');
    await expect(onlineNowCard).toBeVisible();
    
    // Verify all major stat cards
    await expect(page.getByTestId('stat-organizations')).toBeVisible();
    await expect(page.getByTestId('stat-total-users')).toBeVisible();
    await expect(page.getByTestId('stat-campaigns')).toBeVisible();
    
    // Step 3: Navigate to Executive Training
    await page.goto('/executive-training');
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible({ timeout: 10000 });
    
    // Wait for modules to load
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 15000 });
    
    // Verify slide count badges are visible
    await expect(page.locator('text=/\\d+ Slides/').first()).toBeVisible();
    
    // Step 4: Download a presentation
    const downloadButton = page.getByRole('button', { name: /Download PPTX/i }).first();
    await expect(downloadButton).toBeVisible();
    
    // Set up download promise
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Click download
    await downloadButton.click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/\.pptx$/);
  });
});
