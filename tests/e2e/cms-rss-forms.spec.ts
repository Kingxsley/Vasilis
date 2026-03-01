import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, loginAsAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from '../fixtures/helpers';

test.describe('CMS Tiles Management', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
  });

  test('CMS Tiles page loads correctly', async ({ page }) => {
    await page.goto('/cms-tiles');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('cms-tiles-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'CMS Tiles Manager' })).toBeVisible();
  });

  test('Shows default system tiles', async ({ page }) => {
    await page.goto('/cms-tiles');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('cms-tiles-page')).toBeVisible({ timeout: 15000 });
    
    // Verify system tiles are displayed (use first() for potential duplicates in nav)
    await expect(page.locator('[data-testid="cms-tiles-page"]').getByText('Blog').first()).toBeVisible();
    await expect(page.locator('[data-testid="cms-tiles-page"]').getByText('Videos').first()).toBeVisible();
  });

  test('Add New Tile button is visible', async ({ page }) => {
    await page.goto('/cms-tiles');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('cms-tiles-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Add New Tile/i })).toBeVisible();
  });

  test('Can open create tile dialog', async ({ page }) => {
    await page.goto('/cms-tiles');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('cms-tiles-page')).toBeVisible({ timeout: 15000 });
    
    // Click Add New Tile
    await page.getByRole('button', { name: /Add New Tile/i }).click();
    
    // Verify dialog opens with form fields
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog').getByText('Tile Name *')).toBeVisible();
  });
});

test.describe('RSS Feed Manager', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
  });

  test('RSS Feed Manager page loads correctly', async ({ page }) => {
    await page.goto('/rss-feeds');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('rss-feed-manager-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'RSS Feed Manager' })).toBeVisible();
  });

  test('Shows Add RSS Feed button', async ({ page }) => {
    await page.goto('/rss-feeds');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('rss-feed-manager-page')).toBeVisible({ timeout: 15000 });
    // Find the main Add RSS Feed button in header (not suggestion buttons)
    const addButton = page.locator('[data-testid="rss-feed-manager-page"]').getByRole('button', { name: /Add RSS Feed/i, exact: false }).first();
    await expect(addButton).toBeVisible();
  });

  test('Shows popular feeds suggestions', async ({ page }) => {
    await page.goto('/rss-feeds');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('rss-feed-manager-page')).toBeVisible({ timeout: 15000 });
    
    // Check for popular feed suggestions
    await expect(page.getByText('Popular Cybersecurity RSS Feeds')).toBeVisible();
    await expect(page.getByRole('button', { name: /Krebs on Security/i })).toBeVisible();
  });

  test('Can open add feed dialog', async ({ page }) => {
    await page.goto('/rss-feeds');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('rss-feed-manager-page')).toBeVisible({ timeout: 15000 });
    
    // Click Add RSS Feed button from header
    await page.locator('header, [data-testid="rss-feed-manager-page"] > div').first().getByRole('button', { name: /Add RSS Feed/i }).first().click();
    
    // Verify dialog opens - use locator for dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]').getByText('Feed Name *')).toBeVisible();
  });
});

test.describe('Form Submissions Page', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
  });

  test('Form Submissions page loads correctly', async ({ page }) => {
    await page.goto('/form-submissions');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 15000 });
    // Use heading role to avoid matching nav item
    await expect(page.getByRole('heading', { name: 'Form Submissions' })).toBeVisible();
  });

  test('Shows stats cards', async ({ page }) => {
    await page.goto('/form-submissions');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 15000 });
    
    // Check for stats cards - use first() to avoid duplicates
    await expect(page.locator('[data-testid="form-submissions-page"]').getByText('Contact Forms').first()).toBeVisible();
    await expect(page.locator('[data-testid="form-submissions-page"]').getByText('Pending').first()).toBeVisible();
    await expect(page.locator('[data-testid="form-submissions-page"]').getByText('Resolved').first()).toBeVisible();
  });

  test('Shows tabs for Contact Forms and Access Requests', async ({ page }) => {
    await page.goto('/form-submissions');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 15000 });
    
    // Check for tabs
    const contactTab = page.getByRole('tab', { name: /Contact Forms/i });
    const accessTab = page.getByRole('tab', { name: /Access Requests/i });
    
    await expect(contactTab).toBeVisible();
    await expect(accessTab).toBeVisible();
  });

  test('Has refresh button', async ({ page }) => {
    await page.goto('/form-submissions');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();
  });
});
