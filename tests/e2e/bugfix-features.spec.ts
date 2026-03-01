import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, loginAsAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from '../fixtures/helpers';

test.describe('Bug Fixes - Iteration 13', () => {
  // Single comprehensive test to avoid rate limiting from multiple logins
  test('Verify bug fixes: sidebar simplified, CMS tiles in Content Manager, RSS status', async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    
    // ===== TEST 1: Sidebar is simplified - NO Blog/News/Videos/About in sidebar =====
    await page.goto('/dashboard');
    await waitForAppReady(page);
    
    // Verify sidebar has Content section but NOT individual content items like Blog, News, Videos, About
    // These should now only appear in Content Manager tabs
    await expect(page.locator('nav, aside').getByText('Content Manager').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav, aside').getByText('CMS Pages').first()).toBeVisible();
    await expect(page.locator('nav, aside').getByText('Media Library').first()).toBeVisible();
    
    // Blog, News, Videos, About should NOT be in sidebar (simplified sidebar fix)
    const sidebarBlog = page.locator('nav, aside').getByRole('link').filter({ hasText: 'Blog' });
    const sidebarNews = page.locator('nav, aside').getByRole('link').filter({ hasText: 'News' });
    const sidebarVideos = page.locator('nav, aside').getByRole('link').filter({ hasText: 'Videos' });
    const sidebarAbout = page.locator('nav, aside').getByRole('link').filter({ hasText: 'About' });
    
    // These should NOT be visible in sidebar
    await expect(sidebarBlog).toHaveCount(0);
    await expect(sidebarNews).toHaveCount(0);
    await expect(sidebarVideos).toHaveCount(0);
    await expect(sidebarAbout).toHaveCount(0);
    
    // ===== TEST 2: Content Manager shows CMS tiles as tabs =====
    await page.goto('/content');
    await waitForAppReady(page);
    
    // Verify Content Manager loads
    await expect(page.getByRole('heading', { name: 'Content Manager' })).toBeVisible({ timeout: 15000 });
    
    // Verify system tabs are present: Blog, News, Videos, About
    const blogTab = page.getByRole('tab', { name: /Blog/i });
    const newsTab = page.getByRole('tab', { name: /News/i });
    const videosTab = page.getByRole('tab', { name: /Videos/i });
    const aboutTab = page.getByRole('tab', { name: /About/i });
    const rssFeedsTab = page.getByRole('tab', { name: /RSS Feeds/i });
    
    await expect(blogTab).toBeVisible();
    await expect(newsTab).toBeVisible();
    await expect(videosTab).toBeVisible();
    await expect(aboutTab).toBeVisible();
    await expect(rssFeedsTab).toBeVisible();
    
    // ===== TEST 3: RSS Feeds show correct status (Active/Inactive instead of broken) =====
    await rssFeedsTab.click();
    await page.waitForLoadState('networkidle');
    
    // Check that RSS feeds table is visible
    await expect(page.getByText('RSS Feed Sources')).toBeVisible({ timeout: 10000 });
    
    // If there are feeds, check that status shows "Active" or "Inactive" (not broken)
    // The fix changed is_active to enabled field
    const activeStatus = page.locator('td').filter({ hasText: 'Active' });
    const tableRows = page.locator('table tbody tr');
    
    const rowCount = await tableRows.count();
    if (rowCount > 0) {
      // At least one feed should have Active/Inactive status
      const hasValidStatus = await page.locator('table').getByText(/^(Active|Inactive)$/).count();
      expect(hasValidStatus).toBeGreaterThan(0);
    }
    
    // ===== TEST 4: Executive Training has upload feature for super admin =====
    await page.goto('/executive-training');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('executive-training-page')).toBeVisible({ timeout: 15000 });
    
    // Super admin should see Upload Presentation button
    await expect(page.getByRole('button', { name: /Upload Presentation/i })).toBeVisible({ timeout: 10000 });
    
    // Click Upload button to verify dialog opens
    await page.getByRole('button', { name: /Upload Presentation/i }).click();
    
    // Verify dialog opens with form fields
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]').getByText('Presentation Name *')).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
  });
  
  test('Credential Harvest template builder has 2-column layout', async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    
    // Navigate to Credential Harvest
    await page.goto('/credential-harvest');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('credential-harvest-page')).toBeVisible({ timeout: 15000 });
    
    // Click Templates tab
    const templatesTab = page.getByTestId('credential-harvest-page').getByRole('tab', { name: 'Templates' });
    await templatesTab.click();
    await page.waitForTimeout(1000);
    
    // Click Create Template button
    await page.getByRole('button', { name: /Create Template/i }).click();
    await page.waitForTimeout(1000);
    
    // Verify dialog with 2-column layout is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    // Check for 2-column layout elements
    await expect(page.locator('[role="dialog"]').getByText('Add Elements')).toBeVisible();
    await expect(page.locator('[role="dialog"]').getByText('Live Preview')).toBeVisible();
    
    // Verify builder buttons are available
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /Logo/i })).toBeVisible();
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /Header/i })).toBeVisible();
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /CTA Button/i })).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
  });
});
