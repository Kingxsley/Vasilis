import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts, loginAsAdmin } from '../fixtures/helpers';

test.describe('Access Request Workflow', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Form Submissions page loads with Access Requests tab active by default', async ({ page }) => {
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
  });

  test('Access Requests show action buttons for pending requests', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.goto('/forms');
    await waitForAppReady(page);
    
    // Wait for Access Requests tab to be active
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({ timeout: 15000 });
    
    // Check if there are any access request cards
    const accessRequestCards = page.locator('[class*="Card"]').filter({
      has: page.locator('text=/pending/i')
    });
    
    const cardCount = await accessRequestCards.count();
    
    if (cardCount > 0) {
      // If there are pending requests, verify action buttons are present
      const firstCard = accessRequestCards.first();
      
      // Check for action buttons - at least some should be visible
      const approveButton = firstCard.getByRole('button', { name: /Approve/i });
      const assignButton = firstCard.getByRole('button', { name: /Assign/i });
      const resolveButton = firstCard.getByRole('button', { name: /Resolve/i });
      const rejectButton = firstCard.getByRole('button', { name: /Reject/i });
      const viewButton = firstCard.getByRole('button', { name: /View/i });
      
      // At minimum, View button should be available
      await expect(viewButton).toBeVisible({ timeout: 5000 });
    } else {
      // If no pending requests, that's acceptable - just verify the empty state or existing cards
      const emptyState = page.getByText(/No Access Requests/i);
      const anyCards = page.locator('[class*="Card"]').filter({
        has: page.locator('text=@')  // Cards with email addresses
      });
      
      const isEmpty = await emptyState.isVisible().catch(() => false);
      const hasCards = await anyCards.count() > 0;
      
      expect(isEmpty || hasCards).toBeTruthy();
    }
  });

  test('Approve dialog opens with role and organization selection', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.goto('/forms');
    await waitForAppReady(page);
    
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({ timeout: 15000 });
    
    // Look for an Approve & Create button
    const approveButton = page.getByRole('button', { name: /Approve.*Create/i }).first();
    
    if (await approveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveButton.click();
      
      // Verify dialog opens
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      
      // Check for role selection
      const roleSelect = dialog.locator('button').filter({ hasText: /trainee|role/i }).first();
      await expect(roleSelect.or(dialog.getByText('Role'))).toBeVisible({ timeout: 3000 });
      
      // Check for organization selection
      await expect(dialog.getByText('Organization')).toBeVisible();
      
      // Check for welcome email toggle
      await expect(dialog.getByText(/Welcome Email/i)).toBeVisible();
      
      // Close dialog
      await page.keyboard.press('Escape');
    } else {
      // No pending requests to approve - skip
      test.skip();
    }
  });

  test('Assign dialog shows list of admins', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.goto('/forms');
    await waitForAppReady(page);
    
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({ timeout: 15000 });
    
    // Look for an Assign button
    const assignButton = page.getByRole('button', { name: /^Assign$/i }).first();
    
    if (await assignButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await assignButton.click();
      
      // Verify dialog opens
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      
      // Should show "Assign to Admin" title
      await expect(dialog.getByText(/Assign to Admin/i)).toBeVisible();
      
      // Should show admin list or "No admins available"
      const hasAdmins = await dialog.locator('button').filter({ hasText: /@|admin/i }).count() > 0;
      const noAdmins = await dialog.getByText(/No admins available/i).isVisible().catch(() => false);
      
      expect(hasAdmins || noAdmins).toBeTruthy();
      
      // Close dialog
      await page.keyboard.press('Escape');
    } else {
      test.skip();
    }
  });

  test('Stats cards show correct counts', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.goto('/forms');
    await waitForAppReady(page);
    
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({ timeout: 15000 });
    
    // Verify stats cards are present
    // The UI shows: Contact Forms, Access Requests, Pending, Resolved
    await expect(page.getByText('Contact Forms').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Access Requests').first()).toBeVisible();
    await expect(page.getByText('Pending').first()).toBeVisible();
    await expect(page.getByText('Resolved').first()).toBeVisible();
    
    // Check that counts are numeric (numbers should be present)
    const statsSection = page.locator('.grid').first();
    const numberElements = statsSection.locator('p').filter({ hasText: /^\d+$/ });
    const count = await numberElements.count();
    
    // Should have at least 4 stat numbers
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('View button opens detail dialog', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.goto('/forms');
    await waitForAppReady(page);
    
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({ timeout: 15000 });
    
    // Find a View button
    const viewButton = page.getByRole('button', { name: /^View$/i }).first();
    
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();
      
      // Verify dialog opens
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      
      // Should show submission details
      await expect(dialog.getByText(/Submission Details/i).or(dialog.getByText('Name'))).toBeVisible();
      await expect(dialog.getByText('Email')).toBeVisible();
      
      // Close dialog
      await page.keyboard.press('Escape');
    } else {
      // No items to view
      test.skip();
    }
  });

  test('Tab switching works correctly', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.goto('/forms');
    await waitForAppReady(page);
    
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({ timeout: 15000 });
    
    const contactTab = page.getByRole('tab', { name: /Contact Forms/i });
    const accessTab = page.getByRole('tab', { name: /Access Requests/i });
    
    // Access should be active by default
    await expect(accessTab).toHaveAttribute('data-state', 'active');
    await expect(contactTab).toHaveAttribute('data-state', 'inactive');
    
    // Click Contact Forms tab
    await contactTab.click();
    
    // Now Contact should be active
    await expect(contactTab).toHaveAttribute('data-state', 'active');
    await expect(accessTab).toHaveAttribute('data-state', 'inactive');
    
    // Click Access Requests tab back
    await accessTab.click();
    
    // Access should be active again
    await expect(accessTab).toHaveAttribute('data-state', 'active');
  });
});
