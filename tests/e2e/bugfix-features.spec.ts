import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, loginAsAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from '../fixtures/helpers';

test.describe('Bug Fixes and New Features - Iteration 12', () => {
  // Single comprehensive test to avoid rate limiting from multiple logins
  test('Verify all bug fixes and new features', async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    
    // ===== TEST 1: Forms page title is "Forms" (not "Form Submissions") =====
    await page.goto('/form-submissions');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 15000 });
    
    // The page title should now be "Forms" instead of "Form Submissions"
    await expect(page.getByRole('heading', { name: 'Forms', exact: true })).toBeVisible();
    
    // Check for both tabs (consolidated Forms page)
    const contactTab = page.getByRole('tab', { name: /Contact Forms/i });
    const accessTab = page.getByRole('tab', { name: /Access Requests/i });
    
    await expect(contactTab).toBeVisible();
    await expect(accessTab).toBeVisible();
    
    // Stats should show Contact Forms and Access Requests counts
    await expect(page.locator('[data-testid="form-submissions-page"]').getByText('Contact Forms').first()).toBeVisible();
    await expect(page.locator('[data-testid="form-submissions-page"]').getByText('Access Requests').first()).toBeVisible();
    await expect(page.locator('[data-testid="form-submissions-page"]').getByText('Pending').first()).toBeVisible();
    await expect(page.locator('[data-testid="form-submissions-page"]').getByText('Resolved').first()).toBeVisible();
    
    // ===== TEST 2: Navigation shows "Forms" link =====
    await page.goto('/dashboard');
    await waitForAppReady(page);
    
    // Look for "Forms" in the sidebar navigation
    const formsLink = page.locator('nav, aside').getByText('Forms', { exact: true }).first();
    await expect(formsLink).toBeVisible({ timeout: 10000 });
    
    // ===== TEST 3: Navigation includes CMS tiles =====
    // Look for Content section items that are CMS tiles (Blog, News, Videos, About)
    const blogLink = page.locator('nav, aside').getByText('Blog').first();
    const newsLink = page.locator('nav, aside').getByText('News').first();
    const videosLink = page.locator('nav, aside').getByText('Videos').first();
    const aboutLink = page.locator('nav, aside').getByText('About').first();
    
    await expect(blogLink).toBeVisible({ timeout: 10000 });
    await expect(newsLink).toBeVisible();
    await expect(videosLink).toBeVisible();
    await expect(aboutLink).toBeVisible();
    
    // ===== TEST 4: RSS Feed Manager page loads =====
    await page.goto('/rss-feeds');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('rss-feed-manager-page')).toBeVisible({ timeout: 15000 });
    
    // Click Add RSS Feed button
    await page.getByRole('button', { name: /Add RSS Feed/i }).first().click();
    
    // Verify dialog opens with form fields
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]').getByText('Feed Name *')).toBeVisible();
    await expect(page.locator('[role="dialog"]').getByText('RSS Feed URL *')).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
    
    // ===== TEST 5: Executive Training page shows upload features =====
    await page.goto('/executive-training');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible({ timeout: 15000 });
    
    // Super admin should see Upload button
    await expect(page.getByRole('button', { name: /Upload/i })).toBeVisible({ timeout: 10000 });
    
    // Click Upload button
    await page.getByRole('button', { name: /Upload/i }).click();
    
    // Verify dialog opens with form fields
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]').getByText('Presentation Name *')).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
  });
});

// Note: Toast notification fix (closeButton and 3 second duration) is verified by code inspection
// <Toaster position="top-right" richColors closeButton duration={3000} />
// UI testing is unreliable due to quick auto-dismiss
