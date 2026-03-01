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
    
    await expect(page.getByTestId('cms-tiles-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('CMS Tiles Manager')).toBeVisible();
  });

  test('Shows default system tiles', async ({ page }) => {
    await page.goto('/cms-tiles');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('cms-tiles-page')).toBeVisible({ timeout: 10000 });
    
    // Verify system tiles are displayed
    await expect(page.getByText('Blog').first()).toBeVisible();
    await expect(page.getByText('News').first()).toBeVisible();
    await expect(page.getByText('Videos').first()).toBeVisible();
    await expect(page.getByText('About').first()).toBeVisible();
  });

  test('Add New Tile button is visible', async ({ page }) => {
    await page.goto('/cms-tiles');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('cms-tiles-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Add New Tile/i })).toBeVisible();
  });

  test('Can open create tile dialog', async ({ page }) => {
    await page.goto('/cms-tiles');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('cms-tiles-page')).toBeVisible({ timeout: 10000 });
    
    // Click Add New Tile
    await page.getByRole('button', { name: /Add New Tile/i }).click();
    
    // Verify dialog opens with form fields
    await expect(page.getByText('Create New Tile')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Tile Name *')).toBeVisible();
    await expect(page.getByText('URL Slug')).toBeVisible();
  });

  test('System tiles have System badge', async ({ page }) => {
    await page.goto('/cms-tiles');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('cms-tiles-page')).toBeVisible({ timeout: 10000 });
    
    // System tiles should have System badge
    const systemBadges = page.getByText('System');
    await expect(systemBadges.first()).toBeVisible();
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
    
    await expect(page.getByTestId('rss-feed-manager-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('RSS Feed Manager')).toBeVisible();
  });

  test('Shows Add RSS Feed button', async ({ page }) => {
    await page.goto('/rss-feeds');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('rss-feed-manager-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Add RSS Feed/i })).toBeVisible();
  });

  test('Shows popular feeds suggestions', async ({ page }) => {
    await page.goto('/rss-feeds');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('rss-feed-manager-page')).toBeVisible({ timeout: 10000 });
    
    // Check for popular feed suggestions
    await expect(page.getByText('Popular Cybersecurity RSS Feeds')).toBeVisible();
    await expect(page.getByText('Krebs on Security')).toBeVisible();
    await expect(page.getByText('The Hacker News')).toBeVisible();
  });

  test('Can open add feed dialog', async ({ page }) => {
    await page.goto('/rss-feeds');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('rss-feed-manager-page')).toBeVisible({ timeout: 10000 });
    
    // Click Add RSS Feed
    await page.getByRole('button', { name: /Add RSS Feed/i }).first().click();
    
    // Verify dialog opens
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Feed Name *')).toBeVisible();
    await expect(page.getByText('RSS Feed URL *')).toBeVisible();
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
    
    await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Form Submissions')).toBeVisible();
  });

  test('Shows stats cards', async ({ page }) => {
    await page.goto('/form-submissions');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 10000 });
    
    // Check for stats cards
    await expect(page.getByText('Contact Forms')).toBeVisible();
    await expect(page.getByText('Access Requests')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
    await expect(page.getByText('Resolved')).toBeVisible();
  });

  test('Shows tabs for Contact Forms and Access Requests', async ({ page }) => {
    await page.goto('/form-submissions');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 10000 });
    
    // Check for tabs
    const contactTab = page.getByRole('tab', { name: /Contact Forms/i });
    const accessTab = page.getByRole('tab', { name: /Access Requests/i });
    
    await expect(contactTab).toBeVisible();
    await expect(accessTab).toBeVisible();
  });

  test('Can switch between tabs', async ({ page }) => {
    await page.goto('/form-submissions');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 10000 });
    
    // Click Access Requests tab
    await page.getByRole('tab', { name: /Access Requests/i }).click();
    
    // Verify tab content changes
    await expect(page.getByText(/Access Requests/i).first()).toBeVisible();
  });

  test('Has refresh button', async ({ page }) => {
    await page.goto('/form-submissions');
    await waitForAppReady(page);
    
    await expect(page.getByTestId('form-submissions-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();
  });
});
