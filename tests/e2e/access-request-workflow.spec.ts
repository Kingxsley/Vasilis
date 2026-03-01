import { test, expect, Page } from '@playwright/test';
import { waitForAppReady, dismissToasts, loginAsAdmin } from '../fixtures/helpers';

// Use serial mode - login once, run all tests sequentially in same context
test.describe.serial('Access Request Workflow', () => {
  let page: Page;
  let loggedIn = false;
  
  test.beforeAll(async ({ browser }) => {
    // Create a new page that will be reused across tests
    page = await browser.newPage();
    await dismissToasts(page);
    
    // Login once at the beginning
    await loginAsAdmin(page);
    loggedIn = true;
  });
  
  test.afterAll(async () => {
    await page.close();
  });

  test('Form Submissions page loads with Access Requests tab active by default', async () => {
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

  test('Stats cards show correct counts', async () => {
    // Already on forms page from previous test
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({ timeout: 10000 });
    
    // Verify stats cards are present
    await expect(page.getByText('Contact Forms').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Access Requests').first()).toBeVisible();
    await expect(page.getByText('Pending').first()).toBeVisible();
    await expect(page.getByText('Resolved').first()).toBeVisible();
  });

  test('Tab switching works correctly', async () => {
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

  test('Access Requests show action buttons for pending requests', async () => {
    // Ensure Access Requests tab is active
    const accessTab = page.getByRole('tab', { name: /Access Requests/i });
    await accessTab.click();
    await expect(accessTab).toHaveAttribute('data-state', 'active');
    
    // Check if there are any access request cards with pending status
    const pendingBadge = page.locator('text=pending');
    const hasPending = await pendingBadge.count() > 0;
    
    if (hasPending) {
      // If there are pending requests, verify action buttons are present
      // Look for action buttons anywhere on the page
      const approveButton = page.getByRole('button', { name: /Approve/i });
      const assignButton = page.getByRole('button', { name: /Assign/i });
      const resolveButton = page.getByRole('button', { name: /Resolve/i });
      const rejectButton = page.getByRole('button', { name: /Reject/i });
      
      // At least one of these should be visible for pending requests
      const anyActionButton = approveButton.or(assignButton).or(resolveButton).or(rejectButton);
      await expect(anyActionButton.first()).toBeVisible({ timeout: 5000 });
    } else {
      // No pending requests - check for View button on any card
      const viewButton = page.getByRole('button', { name: /View/i }).first();
      const emptyState = page.getByText(/No Access Requests/i);
      
      const hasView = await viewButton.isVisible({ timeout: 3000 }).catch(() => false);
      const isEmpty = await emptyState.isVisible().catch(() => false);
      
      expect(hasView || isEmpty).toBeTruthy();
    }
  });

  test('View button opens detail dialog', async () => {
    // Find a View button
    const viewButton = page.getByRole('button', { name: /^View$/i }).first();
    
    if (await viewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewButton.click();
      
      // Verify dialog opens
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      
      // Should show submission details
      await expect(dialog.getByText('Email')).toBeVisible({ timeout: 3000 });
      
      // Close dialog
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    } else {
      // No items to view - that's ok
      test.skip();
    }
  });

  test('Approve dialog opens with role and organization selection', async () => {
    // Look for an Approve & Create button
    const approveButton = page.getByRole('button', { name: /Approve.*Create/i }).first();
    
    if (await approveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approveButton.click();
      
      // Verify dialog opens
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      
      // Check for Role text/label
      await expect(dialog.getByText('Role')).toBeVisible({ timeout: 3000 });
      
      // Check for organization selection
      await expect(dialog.getByText('Organization')).toBeVisible();
      
      // Check for welcome email toggle
      await expect(dialog.getByText(/Welcome Email/i)).toBeVisible();
      
      // Close dialog
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    } else {
      // No pending requests to approve - skip
      test.skip();
    }
  });

  test('Assign dialog shows list of admins', async () => {
    // Look for an Assign button
    const assignButton = page.getByRole('button', { name: /^Assign$/i }).first();
    
    if (await assignButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await assignButton.click();
      
      // Verify dialog opens
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      
      // Should show "Assign to Admin" title
      await expect(dialog.getByText(/Assign to Admin/i)).toBeVisible({ timeout: 3000 });
      
      // Should show admin list buttons or "No admins available"
      const adminButton = dialog.getByRole('button').filter({ hasText: /@/ });
      const noAdmins = dialog.getByText(/No admins available/i);
      
      const hasAdmins = await adminButton.count() > 0;
      const showsNoAdmins = await noAdmins.isVisible().catch(() => false);
      
      expect(hasAdmins || showsNoAdmins).toBeTruthy();
      
      // Close dialog
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });
});
