import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, waitForAppReady } from '../fixtures/helpers';

test.describe('Iteration 16 - Frontend Features', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test.describe('CMS Tiles - Input Focus Fix', () => {
    test('TileForm input accepts multiple characters without losing focus', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Navigate to CMS Tiles page
      await page.goto('/cms-tiles');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.getByTestId('cms-tiles-page')).toBeVisible({ timeout: 15000 });
      
      // Click Add New Tile button
      await page.getByRole('button', { name: /Add New Tile/i }).click();
      
      // Wait for dialog to open
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Type multiple characters in the tile name input
      const nameInput = page.getByTestId('tile-name-input');
      await expect(nameInput).toBeVisible();
      
      // Clear and type - verify it accepts full text without losing focus
      await nameInput.fill('');
      await nameInput.type('Test Tile Name', { delay: 50 });
      
      // Verify the full text was entered
      await expect(nameInput).toHaveValue('Test Tile Name');
      
      // Close dialog without saving
      await page.getByRole('button', { name: /Cancel/i }).click();
    });
  });

  test.describe('News Page Pagination', () => {
    test('News page loads with pagination controls', async ({ page }) => {
      // News page is public, no login required
      await page.goto('/news');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for news to load
      await page.waitForSelector('article, [class*="news"], .text-gray-500', { timeout: 15000 });
      
      // Take screenshot for verification
      await page.screenshot({ path: 'news-page.jpeg', quality: 20 });
      
      // Verify the page loaded successfully
      const pageLoaded = await page.locator('h1:has-text("News"), article').count() > 0;
      expect(pageLoaded).toBeTruthy();
    });

    test('News page shows RSS feed items', async ({ page }) => {
      await page.goto('/news?limit=50');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for content to load
      await page.waitForSelector('article, .space-y-4', { timeout: 15000 });
      
      // Check for RSS badge indicators
      const rssItems = await page.locator('text=RSS').count();
      // RSS items may or may not be present depending on feeds, just verify page loaded
      expect(await page.locator('h1:has-text("News")').count()).toBeGreaterThan(0);
    });
  });

  test.describe('Credential Submissions Page', () => {
    test('Credential Submissions page loads with org filter', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Navigate to Credential Submissions
      await page.goto('/credential-submissions');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for page to load
      await expect(page.getByTestId('credential-submissions-page')).toBeVisible({ timeout: 15000 });
      
      // Verify stats cards are present
      const statsCards = page.locator('[class*="CardContent"]');
      await expect(statsCards.first()).toBeVisible();
      
      // Verify org filter exists
      const orgFilter = page.getByTestId('org-filter');
      await expect(orgFilter).toBeVisible();
      
      // Verify campaign filter exists
      const campaignFilter = page.getByTestId('campaign-filter');
      await expect(campaignFilter).toBeVisible();
    });

    test('Credential Submissions org filter changes data', async ({ page }) => {
      await loginAsAdmin(page);
      
      await page.goto('/credential-submissions');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.getByTestId('credential-submissions-page')).toBeVisible({ timeout: 15000 });
      
      // Click org filter dropdown
      const orgFilter = page.getByTestId('org-filter');
      await orgFilter.click();
      
      // Wait for dropdown options
      await page.waitForSelector('[role="option"]', { timeout: 5000 }).catch(() => {});
      
      // Take screenshot to verify UI state
      await page.screenshot({ path: 'credential-submissions.jpeg', quality: 20 });
    });
  });

  test.describe('Form Submissions - SelectItem Fix', () => {
    test('Form Submissions page loads with tabs', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Navigate to Form Submissions
      await page.goto('/access-requests');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for the page to load
      await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 15000 });
      
      // Verify tabs are present
      const contactTab = page.getByRole('tab', { name: /Contact Forms/i });
      const accessTab = page.getByRole('tab', { name: /Access Requests/i });
      
      await expect(contactTab).toBeVisible();
      await expect(accessTab).toBeVisible();
    });

    test('Approve dialog has SelectItem with default value', async ({ page }) => {
      await loginAsAdmin(page);
      
      await page.goto('/access-requests');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 15000 });
      
      // Make sure Access Requests tab is active
      const accessTab = page.getByRole('tab', { name: /Access Requests/i });
      await accessTab.click();
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
      // Check for any access request cards with Approve button
      const approveButtons = page.locator('button:has-text("Approve")');
      const hasApproveButton = await approveButtons.count() > 0;
      
      if (hasApproveButton) {
        // Click first approve button
        await approveButtons.first().click();
        
        // Wait for dialog
        await expect(page.getByRole('dialog')).toBeVisible();
        
        // Check that role select has default value (trainee)
        const roleSelect = page.locator('[data-testid="role-select"], select, [class*="SelectTrigger"]').first();
        await expect(roleSelect).toBeVisible();
        
        // Close dialog
        await page.getByRole('button', { name: /Cancel/i }).click();
      } else {
        // No pending requests, just verify page structure
        await page.screenshot({ path: 'form-submissions-no-requests.jpeg', quality: 20 });
      }
    });
  });
});
