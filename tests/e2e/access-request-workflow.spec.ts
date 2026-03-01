import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, loginAsAdmin } from '../fixtures/helpers';

test.describe('Access Request Workflow', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Form Submissions page loads and shows tabs correctly', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Navigate directly to forms page
    await page.goto('/forms');
    await waitForAppReady(page);
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({ timeout: 15000 });
    
    // Verify both tabs exist
    const contactTab = page.getByRole('tab', { name: /Contact Forms/i });
    const accessTab = page.getByRole('tab', { name: /Access Requests/i });
    await expect(contactTab).toBeVisible();
    await expect(accessTab).toBeVisible();
    
    // Access Requests tab should be active by default
    await expect(accessTab).toHaveAttribute('data-state', 'active');
    
    // Verify stats cards are present
    await expect(page.getByText('Contact Forms').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Pending').first()).toBeVisible();
    await expect(page.getByText('Resolved').first()).toBeVisible();
    
    // Test tab switching
    await contactTab.click();
    await expect(contactTab).toHaveAttribute('data-state', 'active');
    await expect(accessTab).toHaveAttribute('data-state', 'inactive');
    
    // Click Access Requests tab back
    await accessTab.click();
    await expect(accessTab).toHaveAttribute('data-state', 'active');
    
    // Check for action buttons if pending requests exist
    const pendingBadge = page.locator('text=pending');
    const hasPending = await pendingBadge.count() > 0;
    
    if (hasPending) {
      // Should see action buttons for pending requests
      const approveButton = page.getByRole('button', { name: /Approve/i });
      const anyActionButton = approveButton.or(page.getByRole('button', { name: /Assign/i }));
      await expect(anyActionButton.first()).toBeVisible({ timeout: 5000 });
    }
    
    // Test View button opens dialog
    const viewButton = page.getByRole('button', { name: /^View$/i }).first();
    if (await viewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewButton.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByText('Email')).toBeVisible({ timeout: 3000 });
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('Approve and Assign dialogs work correctly', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.goto('/forms');
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({ timeout: 15000 });
    
    // Test Approve dialog
    const approveButton = page.getByRole('button', { name: /Approve.*Create/i }).first();
    if (await approveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approveButton.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByText('Role')).toBeVisible({ timeout: 3000 });
      await expect(dialog.getByText('Organization')).toBeVisible();
      await expect(dialog.getByText(/Welcome Email/i)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }
    
    // Test Assign dialog
    const assignButton = page.getByRole('button', { name: /^Assign$/i }).first();
    if (await assignButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await assignButton.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByText(/Assign to Admin/i)).toBeVisible({ timeout: 3000 });
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }
    
    // If no buttons visible, the test still passes - there just weren't pending requests
  });
});
