import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, loginAsAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from '../fixtures/helpers';

test.describe('Executive Training - 9 Modules', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
  });

  test('Executive Training page shows 9 pre-built modules', async ({ page }) => {
    await page.goto('/executive-training');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible({ timeout: 10000 });
    
    // Wait for modules to load
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 15000 });
    
    // Count the download buttons to verify 9 modules
    const downloadButtons = page.getByRole('button', { name: /Download PPTX/i });
    await expect(downloadButtons).toHaveCount(9, { timeout: 15000 });
  });

  test('All 9 expected module titles are visible', async ({ page }) => {
    await page.goto('/executive-training');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible({ timeout: 10000 });
    
    // Wait for modules section
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 15000 });
    
    // Verify all 9 module titles are visible
    const expectedModules = [
      'Email Phishing Awareness',
      'Social Engineering Defense',
      'Password Security',
      'Data Protection & Privacy',
      'Ransomware Awareness',
      'Insider Threat Awareness',
      'Mobile Device Security',
      'Remote Work Security',
      'Business Email Compromise'
    ];
    
    for (const moduleTitle of expectedModules) {
      await expect(page.getByText(moduleTitle)).toBeVisible({ timeout: 5000 });
    }
  });

  test('Each module displays slide count', async ({ page }) => {
    await page.goto('/executive-training');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 15000 });
    
    // Verify slide count badges - should have 9 badges with "Slides" text
    const slideBadges = page.locator('text=/\\d+ Slides/');
    await expect(slideBadges.first()).toBeVisible();
    
    // Count should be at least 9 (one per module)
    const count = await slideBadges.count();
    expect(count).toBeGreaterThanOrEqual(9);
  });

  test('Can download PPTX presentation', async ({ page }) => {
    await page.goto('/executive-training');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pre-built Training Modules')).toBeVisible({ timeout: 15000 });
    
    const downloadButton = page.getByRole('button', { name: /Download PPTX/i }).first();
    await expect(downloadButton).toBeVisible();
    
    // Set up download promise
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Click download
    await downloadButton.click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename ends with .pptx
    expect(download.suggestedFilename()).toMatch(/\.pptx$/);
  });
});

test.describe('Dashboard Stats', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
  });

  test('Dashboard shows all major stat cards', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
    
    // Verify stat cards are visible
    await expect(page.getByTestId('stat-online-now')).toBeVisible();
    await expect(page.getByTestId('stat-organizations')).toBeVisible();
    await expect(page.getByTestId('stat-total-users')).toBeVisible();
    await expect(page.getByTestId('stat-campaigns')).toBeVisible();
  });
});
